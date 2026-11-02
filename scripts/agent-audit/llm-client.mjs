/**
 * OpenAI-compatible chat completions client (tolerates plain-text and alternate JSON shapes).
 */

const RETRYABLE_STATUS = new Set([408, 429, 502, 503, 504, 520, 521, 522, 524]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function useStreaming() {
  return process.env.AGENT_AUDIT_LLM_STREAM !== '0';
}

/** 9router stream affinity via query string (not JSON body; upstream rejects body `sticky`). */
function useStickyStreamQuery() {
  return process.env.AGENT_AUDIT_LLM_STICKY !== '0';
}

function chatCompletionsUrl(baseUrl, { stickyQuery = false } = {}) {
  const path = `${String(baseUrl).replace(/\/$/, '')}/chat/completions`;
  if (!stickyQuery) return path;
  return `${path}?sticky=true`;
}

function isStickyUnsupportedError(status, text) {
  if (status !== 400) return false;
  return /sticky/i.test(String(text || ''));
}

function buildAuthHeaders(apiKey) {
  const headers = { 'Content-Type': 'application/json' };
  const trimmed = String(apiKey || '').trim();
  if (process.env.AGENT_AUDIT_API_KEY_HEADER === 'x-api-key') {
    headers['x-api-key'] = trimmed;
  } else {
    headers.Authorization = `Bearer ${trimmed}`;
  }
  return headers;
}

function parseToolCall(tc) {
  const fn = tc?.function || tc;
  const name = fn?.name;
  if (!name) return null;
  let args = {};
  try {
    const raw = fn.arguments ?? fn.args ?? '{}';
    args = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
  } catch {
    args = {};
  }
  return { name, args };
}

function toolCallsToAgentJson(message) {
  const calls = message?.tool_calls;
  if (!Array.isArray(calls) || !calls.length) return '';
  const parsed = calls.map(parseToolCall).filter(Boolean);
  if (!parsed.length) return '';
  if (parsed.length === 1) {
    return JSON.stringify({ type: 'tool', name: parsed[0].name, args: parsed[0].args });
  }
  return JSON.stringify({ type: 'batch', tools: parsed });
}

function extractAssistantText(data, rawText) {
  if (data == null) return String(rawText || '');
  if (typeof data === 'string') return data;

  const c0 = data.choices?.[0];
  const fromTools = toolCallsToAgentJson(c0?.message);
  if (fromTools) return fromTools;

  if (c0?.message?.content != null) {
    const mc = c0.message.content;
    if (typeof mc === 'string' && mc.trim()) return mc;
    if (Array.isArray(mc)) {
      return mc.map((part) => part?.text ?? part?.content ?? '').join('');
    }
  }
  if (typeof c0?.message?.refusal === 'string' && c0.message.refusal.trim()) {
    return c0.message.refusal;
  }
  if (typeof c0?.text === 'string') return c0.text;

  if (typeof data.content === 'string') return data.content;
  if (Array.isArray(data.content)) {
    return data.content.map((part) => part?.text ?? part?.content ?? '').join('');
  }

  if (typeof data.output_text === 'string') return data.output_text;
  if (typeof data.output === 'string') return data.output;
  if (typeof data.result === 'string') return data.result;
  if (data.message?.content && typeof data.message.content === 'string') {
    return data.message.content;
  }
  if (typeof data.reasoning === 'string' && data.reasoning.trim()) return data.reasoning;
  if (typeof c0?.message?.reasoning === 'string' && c0.message.reasoning.trim()) {
    return c0.message.reasoning;
  }

  if (isReasoningOnlyResponse(data)) return '';

  return rawText || JSON.stringify(data);
}

function isReasoningOnlyResponse(data) {
  const msg = data?.choices?.[0]?.message;
  if (!msg) return false;
  const content = String(msg.content ?? '').trim();
  const reasoning = String(msg.reasoning_content ?? msg.reasoning ?? '').trim();
  return !content && reasoning.length > 0;
}

function emptyContentHint(data) {
  const c0 = data?.choices?.[0];
  if (!c0) return 'no choices[0]';
  const reasoningLen = String(c0.message?.reasoning_content ?? c0.message?.reasoning ?? '').length;
  return `finish_reason=${c0.finish_reason ?? '?'} content=${typeof c0.message?.content} tool_calls=${c0.message?.tool_calls?.length ?? 0} reasoning_chars=${reasoningLen}`;
}

function stripHtmlErrorSnippet(text) {
  const t = String(text || '');
  if (!t.includes('<!DOCTYPE') && !t.includes('<html')) return t.slice(0, 500);
  const title = t.match(/<title>([^<]+)<\/title>/i);
  if (title) return title[1].trim();
  return t.slice(0, 200).replace(/\s+/g, ' ');
}

async function readSseContent(res, onLog) {
  if (!res.body) {
    return res.text();
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let assembled = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta;
        const msg = json.choices?.[0]?.message;
        const piece =
          delta?.content ??
          msg?.content ??
          delta?.text ??
          json.delta?.text ??
          json.text ??
          '';
        if (piece) {
          assembled += piece;
        } else {
          const toolJson = toolCallsToAgentJson(msg);
          if (toolJson) assembled = toolJson;
        }
      } catch {
        /* non-JSON data line */
      }
    }
  }
  onLog?.(`LLM stream assembled ${assembled.length} chars`);
  return assembled;
}

/**
 * @returns {Promise<{ content: string, rawBody: string, parseMode: 'json'|'plain'|'stream' }>}
 */
export async function chatCompletion({
  baseUrl,
  apiKey,
  model,
  messages,
  temperature = 0.2,
  maxTokens,
  intent = 'tool',
  onLog
}) {
  const finishDefault = parseInt(process.env.AGENT_AUDIT_MAX_TOKENS_FINISH || process.env.AGENT_AUDIT_MAX_TOKENS || '8192', 10);
  const toolDefault = parseInt(process.env.AGENT_AUDIT_MAX_TOKENS_TOOL || '512', 10);
  const max_tokens =
    maxTokens ??
    (intent === 'finish' ? finishDefault : toolDefault);
  const timeoutMs = parseInt(process.env.AGENT_AUDIT_LLM_TIMEOUT_MS || '540000', 10);
  const maxRetries = parseInt(process.env.AGENT_AUDIT_LLM_RETRIES || '3', 10);
  let streamEnabled = useStreaming();
  let stickyQuery = useStickyStreamQuery();

  let lastErr;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    let res;
    let text;
    let respondedWithStream = false;

    try {
      for (let streamPass = 0; streamPass < 2; streamPass += 1) {
        const useStream = streamEnabled && streamPass === 0;
        const payload = {
          model,
          messages,
          temperature,
          max_tokens,
          stream: useStream
        };
        const requestUrl = chatCompletionsUrl(baseUrl, {
          stickyQuery: useStream && stickyQuery
        });
        const body = JSON.stringify(payload);
        onLog?.(
          `LLM POST ${requestUrl} (attempt ${attempt}/${maxRetries}, stream=${useStream}, stickyQuery=${useStream && stickyQuery}, bodyBytes=${body.length}, messages=${messages.length})`
        );

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const fetchStarted = Date.now();
        try {
          res = await fetch(requestUrl, {
            method: 'POST',
            headers: buildAuthHeaders(apiKey),
            body,
            signal: controller.signal
          });
          if (useStream && res.ok) {
            text = await readSseContent(res, onLog);
            respondedWithStream = true;
          } else {
            text = await res.text();
            respondedWithStream = false;
          }
        } finally {
          clearTimeout(timer);
        }
        onLog?.(`LLM round-trip ${Date.now() - fetchStarted}ms`);

        if (useStream && res.ok && !String(text || '').trim()) {
          onLog?.('Stream empty; immediate non-stream fallback on same attempt');
          streamEnabled = false;
          continue;
        }
        break;
      }
    } catch (err) {
      const msg =
        err.name === 'AbortError'
          ? `LLM request aborted after ${timeoutMs}ms (client timeout)`
          : err.message || String(err);
      lastErr = new Error(msg);
      lastErr.cause = err;
      onLog?.(`LLM network error: ${msg}`);
      if (attempt < maxRetries) {
        const wait = attempt * 5000;
        onLog?.(`Retrying in ${wait / 1000}s…`);
        await sleep(wait);
        continue;
      }
      throw lastErr;
    }

    const rawBody = text.slice(0, 100_000);
    onLog?.(`LLM HTTP ${res.status}, body ${text.length} bytes`);

    if (!res.ok) {
      const detail = stripHtmlErrorSnippet(text);
      if (isStickyUnsupportedError(res.status, text) && stickyQuery) {
        onLog?.('Sticky rejected by router; retrying without ?sticky=true');
        stickyQuery = false;
        continue;
      }
      lastErr = new Error(`LLM HTTP ${res.status}: ${detail}`);
      lastErr.status = res.status;
      lastErr.body = rawBody;
      if (RETRYABLE_STATUS.has(res.status) && attempt < maxRetries) {
        const wait = attempt * 8000;
        onLog?.(`Retryable HTTP ${res.status}, waiting ${wait / 1000}s…`);
        await sleep(wait);
        continue;
      }
      throw lastErr;
    }

    if (respondedWithStream) {
      const streamText = String(text || '').trim();
      if (!streamText) {
        onLog?.('Stream response empty after parse');
        lastErr = new Error('LLM stream returned no content');
        lastErr.status = res.status;
        if (attempt < maxRetries) {
          const wait = attempt * 5000;
          onLog?.(`Retrying after empty stream in ${wait / 1000}s…`);
          await sleep(wait);
          continue;
        }
        throw lastErr;
      }
      return { content: streamText, rawBody, parseMode: 'stream' };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      const trimmed = text.trim();
      if (!trimmed) {
        throw new Error('LLM returned empty body (HTTP 200)');
      }
      onLog?.('LLM body treated as plain text (not JSON)');
      return { content: text, rawBody, parseMode: 'plain' };
    }

    const content = extractAssistantText(data, text);
    if (!String(content || '').trim()) {
      onLog?.(`LLM empty message (${emptyContentHint(data)}); body preview: ${rawBody.slice(0, 500)}`);
      const reasoningOnly = isReasoningOnlyResponse(data);
      lastErr = new Error(
        reasoningOnly
          ? 'LLM returned reasoning only (empty content field)'
          : 'LLM returned empty message content'
      );
      lastErr.status = res.status;
      lastErr.body = rawBody;
      if (attempt < maxRetries) {
        const wait = attempt * 6000;
        onLog?.(`Retrying after empty JSON content in ${wait / 1000}s…`);
        await sleep(wait);
        continue;
      }
      throw lastErr;
    }

    onLog?.(`LLM content ${String(content).length} chars (json envelope)`);
    return { content: String(content), rawBody, parseMode: 'json' };
  }

  throw lastErr || new Error('LLM request failed');
}

export {
  extractAssistantText,
  stripHtmlErrorSnippet,
  buildAuthHeaders,
  toolCallsToAgentJson,
  emptyContentHint,
  isReasoningOnlyResponse
};
