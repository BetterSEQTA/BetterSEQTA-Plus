import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chatCompletion } from './llm-client.mjs';
import { createToolHost, TOOL_DEFINITIONS } from './tools.mjs';
import { parseAgentJson, extractFinishReport, displaySummary } from './lib/audit-cjs.mjs';
import { evaluateFinishGate, resolveMinFinishTurns } from './lib/finish-gate.mjs';
import { runRipgrep, resolveGrepSanityProbe } from './lib/rg-run.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadPrompt(mode) {
  const file = mode === 'soc2' ? 'soc2.md' : 'security.md';
  return fs.readFileSync(path.join(__dirname, 'prompts', file), 'utf8');
}

function buildInitialUserMessage(mode, context) {
  if (process.env.AGENT_AUDIT_EMBED_CONTEXT === '1') {
    return `Begin the ${mode} audit. Context summary (use read_context_bundle for full JSON):\n${contextSummary(context)}`;
  }
  const sha = context.git?.sha ? String(context.git.sha).slice(0, 12) : '';
  const repo = context.git?.repository || '';
  const meta = [repo, sha].filter(Boolean).join(' @ ');
  return [
    `Begin the ${mode} audit.${meta ? ` Repository ${meta}.` : ''}`,
    'Do NOT guess repo facts. Your FIRST reply must be a tool call only:',
    '{"type":"tool","name":"read_context_bundle","args":{}}',
    'Then use read_file and grep across every focus area in the system prompt.',
    'Send finish only when you are extremely confident no critical or high issues remain in what you checked. Empty findings require high confidence and honest limitations.',
    'The harness rejects finish that is too shallow or too early.'
  ].join('\n');
}

function contextSummary(context) {
  return JSON.stringify(
    {
      mode: context.mode,
      git: context.git,
      npmAudit: context.npmAudit,
      securityGreps: context.securityGreps,
      migrationsRecent: context.migrationsRecent,
      hints: {
        hasServerIndex: !!context.fileHints?.serverIndex,
        hasPolicies: !!context.soc2?.policies
      }
    },
    null,
    2
  ).slice(0, 12000);
}

function turnBudgetNudge(turnIndex, maxTurns) {
  const remaining = maxTurns - turnIndex;
  if (remaining === 20) {
    return 'About 20 turns left. Keep covering focus areas with read_file and grep. Finish only when extremely confident; the harness rejects shallow clean reports.';
  }
  if (remaining === 10) {
    return 'About 10 turns left. Finish only if every focus area is checked and you are extremely confident. Otherwise read the highest-risk paths still open.';
  }
  if (remaining === 3) {
    return 'Hard cap soon. Send {"type":"finish","report":{...}} with honest limitations for anything not read. Do not claim no issues in areas you skipped.';
  }
  return null;
}

function trimMessages(messages) {
  const max = parseInt(process.env.AGENT_AUDIT_TRIM_MAX_MESSAGES || '48', 10);
  if (process.env.AGENT_AUDIT_TRIM_MESSAGES === '0') return messages;
  if (messages.length <= max) return messages;
  const head = messages.slice(0, 2);
  const tail = messages.slice(-(max - 2));
  return [
    ...head,
    {
      role: 'user',
      content:
        '[Earlier turns trimmed from context. Re-run read_file or grep if you need those paths again.]'
    },
    ...tail
  ];
}

function finishResult(report, turnsUsed, loopStartedMs) {
  return {
    report,
    turnsUsed,
    durationMs: loopStartedMs != null ? Date.now() - loopStartedMs : null
  };
}

export async function runAgentLoop({
  mode,
  context,
  repoRoot,
  baseUrl,
  apiKey,
  model,
  minTurns = 25,
  maxTurns,
  onTranscriptLine,
  onLog
}) {
  const loopStartedMs = Date.now();
  const log = (msg) => onLog?.(msg);
  const tools = createToolHost(repoRoot);
  const system = loadPrompt(mode);
  const toolDoc = JSON.stringify(TOOL_DEFINITIONS, null, 2);

  const minFinishTurns = resolveMinFinishTurns(minTurns);
  const depthNote =
    minTurns > 0
      ? `\nDepth and confidence: use at least ${minFinishTurns} tool turns before finish. Finish is rejected before turn ${minTurns}. Send finish only when extremely confident no critical or high issues remain in checked areas. Empty findings mean high-confidence clean scope; otherwise record findings or detailed limitations. Optimistic early finish is rejected.`
      : '';
  const messages = [
    { role: 'system', content: `${system}${depthNote}\n\nTool reference:\n${toolDoc}` },
    { role: 'user', content: buildInitialUserMessage(mode, context) }
  ];
  log(`Initial prompt size ~${JSON.stringify(messages).length} bytes (context via read_context_bundle tool)`);

  let finalReport = null;
  let lastAssistantContent = '';
  let turnsUsed = 0;
  let emptyResponseRecoveries = 0;
  const maxEmptyRecoveries = parseInt(process.env.AGENT_AUDIT_EMPTY_RECOVERIES || '3', 10);
  let contextBundleDelivered = false;
  const tooling = {
    grepBroken: false,
    grepSanityFailed: false,
    grepErrorDetail: ''
  };
  const sanityProbe = resolveGrepSanityProbe(repoRoot);
  if (sanityProbe) {
    const sanity = runRipgrep({
      repoRoot,
      pattern: sanityProbe.pattern,
      glob: sanityProbe.glob || '',
      maxMatches: Math.max(sanityProbe.minMatches || 1, 5)
    });
    if (sanity.error || sanity.matchCount < (sanityProbe.minMatches || 1)) {
      tooling.grepSanityFailed = true;
      tooling.grepErrorDetail =
        sanity.error || `sanity matchCount ${sanity.matchCount} for ${sanityProbe.pattern}`;
      log(`Ripgrep sanity check failed: ${tooling.grepErrorDetail}`);
    } else {
      log(`Ripgrep sanity ok (${sanity.matchCount} hits for ${sanityProbe.pattern})`);
    }
  }

  for (let turn = 0; turn < maxTurns; turn += 1) {
    turnsUsed = turn + 1;
    const budgetMsg = turnBudgetNudge(turn, maxTurns);
    if (budgetMsg) {
      messages.push({ role: 'user', content: budgetMsg });
      log(`Turn ${turn + 1}/${maxTurns}: turn-budget nudge (${maxTurns - turn} left)`);
    }
    log(`Turn ${turn + 1}/${maxTurns}: calling model…`);
    let llm;
    try {
      llm = await chatCompletion({
        baseUrl,
        apiKey,
        model,
        messages: trimMessages(messages),
        onLog: log
      });
    } catch (err) {
      const empty =
        /empty message content|reasoning only|empty body|no content|stream returned no content/i.test(
          String(err.message || '')
        );
      if (empty && emptyResponseRecoveries < maxEmptyRecoveries && turn < maxTurns - 1) {
        emptyResponseRecoveries += 1;
        log(
          `Turn ${turn + 1} LLM empty response; recovery ${emptyResponseRecoveries}/${maxEmptyRecoveries}`
        );
        onTranscriptLine?.({
          turn,
          role: 'error',
          message: err.message,
          recoverable: true,
          bodyPreview: String(err.body || '').slice(0, 800)
        });
        const nudge = /reasoning only/i.test(String(err.message || ''))
          ? 'You sent chain-of-thought in reasoning_content with an empty content field. Put your entire reply in content as one JSON object only: {"type":"tool",...} or {"type":"finish","report":{...}}. No prose outside JSON.'
          : 'Your last assistant message was empty. Reply with one JSON object only: {"type":"tool",...} or {"type":"finish","report":{...}}.';
        messages.push({ role: 'user', content: nudge });
        continue;
      }
      log(`Turn ${turn + 1} LLM failed: ${err.message}`);
      onTranscriptLine?.({
        turn,
        role: 'error',
        message: err.message,
        status: err.status,
        bodyPreview: String(err.body || '').slice(0, 1500)
      });
      return finishResult(buildLlmErrorReport(mode, err), turnsUsed, loopStartedMs);
    }
    const assistantContent = llm.content;
    lastAssistantContent = assistantContent;

    onTranscriptLine?.({
      turn,
      role: 'assistant',
      content: assistantContent,
      parseMode: llm.parseMode,
      rawBodyPreview: llm.rawBody.slice(0, 4000)
    });
    messages.push({ role: 'assistant', content: assistantContent });

    let parsed;
    try {
      parsed = parseAgentJson(assistantContent);
    } catch (err) {
      messages.push({
        role: 'user',
        content:
          'Invalid JSON. Reply with a single JSON object only: {"type":"tool",...} or {"type":"finish","report":{...}}'
      });
      onTranscriptLine?.({ turn, role: 'system', content: 'parse_error_retry' });
      continue;
    }

    if (parsed.type === 'finish') {
      finalReport =
        parsed.report && typeof parsed.report === 'object'
          ? parsed.report
          : extractFinishReport(assistantContent);
      if (finalReport) {
        const gate = evaluateFinishGate({
          turnIndex: turn,
          minTurns,
          minFinishTurns,
          mode,
          report: finalReport,
          tooling
        });
        if (!gate.accept) {
          log(`Turn ${turn + 1}: finish rejected (${gate.userMessage.slice(0, 120)}...)`);
          messages.push({ role: 'user', content: gate.userMessage });
          onTranscriptLine?.({ turn, role: 'system', content: 'finish_rejected' });
          finalReport = null;
          continue;
        }
        log(`Turn ${turn + 1}: received finish report`);
        break;
      }
    }

    if (parsed.type === 'tool' && parsed.name) {
      log(`Turn ${turn + 1}: tool ${parsed.name}`);
      let result;
      if (parsed.name === 'read_context_bundle' && contextBundleDelivered) {
        result = {
          note:
            'Context bundle was already loaded this run. Use grep and read_file instead of read_context_bundle again.'
        };
      } else {
        result = tools.dispatch(parsed.name, parsed.args || {}, context);
        if (parsed.name === 'read_context_bundle') contextBundleDelivered = true;
        if (parsed.name === 'grep' && result?.error) {
          tooling.grepBroken = true;
          tooling.grepErrorDetail = result.detail || result.error;
        }
      }
      const toolResult = JSON.stringify(result).slice(0, 14000);
      const userMsg = { role: 'user', content: `Tool result for ${parsed.name}:\n${toolResult}` };
      messages.push(userMsg);
      onTranscriptLine?.({
        turn,
        role: 'tool',
        name: parsed.name,
        args: parsed.args || {},
        content: toolResult.slice(0, 2000)
      });
      continue;
    }

    messages.push({
      role: 'user',
      content: 'Expected type "tool" or "finish". Continue auditing or finish with report JSON.'
    });
  }

  if (!finalReport) {
    const listKey = mode === 'soc2' ? 'gaps' : 'findings';
    const statusHint =
      mode === 'soc2'
        ? 'with status fail, partial, or pass'
        : 'with severity and category';
    messages.push({
      role: 'user',
      content: `Turn limit reached. Respond NOW with {"type":"finish","report":{...}} using best effort from work so far. Include a populated "${listKey}" array (every item in summary must appear there ${statusHint}). Do not describe issues only in summary prose.`
    });
    log('Turn limit reached; requesting final summary from model…');
    let forcedLlm;
    try {
      forcedLlm = await chatCompletion({
        baseUrl,
        apiKey,
        model,
        messages: trimMessages(messages),
        onLog: log
      });
    } catch (err) {
      log(`Final LLM call failed: ${err.message}`);
      onTranscriptLine?.({ turn: maxTurns, role: 'error', message: err.message, status: err.status });
      return finishResult(buildLlmErrorReport(mode, err, lastAssistantContent), turnsUsed, loopStartedMs);
    }
    turnsUsed = maxTurns + 1;
    const forced = forcedLlm.content;
    lastAssistantContent = forced;
    onTranscriptLine?.({
      turn: maxTurns,
      role: 'assistant',
      content: forced,
      forced: true,
      parseMode: forcedLlm.parseMode
    });
    try {
      const parsed = parseAgentJson(forced);
      if (parsed.type === 'finish' && parsed.report) finalReport = parsed.report;
    } catch {
      /* prose fallback below */
    }
  }

  if (!finalReport) {
    finalReport = buildProseFallbackReport(mode, lastAssistantContent);
  }

  return finishResult(finalReport, turnsUsed, loopStartedMs);
}

function buildLlmLimitations(msg) {
  const lines = ['LLM request failed before a structured report was produced.'];
  if (/reasoning only/i.test(msg)) {
    lines.push(
      'The model returned chain-of-thought in reasoning_content with an empty content field. Use a model/route that puts JSON in content, or set AGENT_AUDIT_MODEL to one that follows the tool JSON protocol.'
    );
  }
  if (/524|timeout|aborted/i.test(msg)) {
    lines.push(
      'HTTP 524 usually means Cloudflare timed out waiting on 9router; increase origin timeout or use a faster model.'
    );
  }
  return lines;
}

function buildLlmErrorReport(mode, err, partialText = '') {
  const msg = err?.message || String(err);
  const base = {
    requiresAction: false,
    summary: `Audit stopped: ${msg}`,
    llmError: {
      message: msg,
      status: err?.status ?? null,
      bodyPreview: String(err?.body || '').slice(0, 3000)
    },
    rawAssistantOutput: String(partialText || '').trim() || undefined,
    checkedAreas: [],
    limitations: buildLlmLimitations(msg)
  };
  if (mode === 'soc2') {
    return {
      ...base,
      overallPosture: 'yellow',
      gaps: [],
      strengths: [],
      attestationNeeded: []
    };
  }
  return { ...base, findings: [] };
}

function buildProseFallbackReport(mode, text) {
  const body = String(text || '').trim();
  const salvaged = extractFinishReport(body);
  if (salvaged && (salvaged.findings?.length || salvaged.gaps?.length || salvaged.summary)) {
    const limitations = Array.isArray(salvaged.limitations) ? [...salvaged.limitations] : [];
    limitations.push('Report recovered from assistant JSON (envelope or truncated body).');
    if (mode === 'soc2') {
      return {
        ...salvaged,
        gaps: salvaged.gaps || [],
        strengths: salvaged.strengths || [],
        attestationNeeded: salvaged.attestationNeeded || [],
        overallPosture: salvaged.overallPosture || 'yellow',
        limitations,
        rawAssistantOutput: body.length > 4000 ? body : undefined
      };
    }
    return {
      ...salvaged,
      findings: salvaged.findings || [],
      limitations,
      rawAssistantOutput: body.length > 4000 ? body : undefined
    };
  }
  const summary =
    displaySummary({ summary: body }) ||
    'Audit completed without a structured report from the model. See Raw for assistant output.';
  const base = {
    requiresAction: false,
    summary,
    rawAssistantOutput: body,
    checkedAreas: [],
    limitations: ['Model did not return valid {"type":"finish","report":{...}}; see rawAssistantOutput.']
  };
  if (mode === 'soc2') {
    return {
      ...base,
      overallPosture: 'yellow',
      gaps: [],
      strengths: [],
      attestationNeeded: []
    };
  }
  return { ...base, findings: [] };
}
