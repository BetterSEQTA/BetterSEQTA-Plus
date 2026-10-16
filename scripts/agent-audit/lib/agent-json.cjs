'use strict';

function parseAgentJson(content) {
  const trimmed = String(content || '').trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

function extractBalancedJsonSlice(text, startIndex) {
  const open = text[startIndex];
  if (open !== '[' && open !== '{') return null;
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIndex; i < text.length; i += 1) {
    const c = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === open) depth += 1;
    if (c === close) {
      depth -= 1;
      if (depth === 0) return text.slice(startIndex, i + 1);
    }
  }
  return null;
}

/**
 * Pull a JSON array value for a key from truncated or noisy assistant JSON.
 */
function extractJsonArrayField(text, fieldName) {
  const body = String(text || '');
  const re = new RegExp(`"${fieldName}"\\s*:`, 'i');
  const m = re.exec(body);
  if (!m) return null;
  const bracket = body.indexOf('[', m.index);
  if (bracket < 0) return null;
  const slice = extractBalancedJsonSlice(body, bracket);
  if (!slice) return null;
  try {
    const arr = JSON.parse(slice);
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

/**
 * Pull a finish report object out of assistant text (full envelope or report-only).
 */
function extractFinishReport(text) {
  const body = String(text || '').trim();
  if (!body) return null;
  try {
    const parsed = parseAgentJson(body);
    if (parsed?.type === 'finish' && parsed.report && typeof parsed.report === 'object') {
      return parsed.report;
    }
    if (parsed?.findings || parsed?.gaps) {
      return parsed;
    }
    if (parsed?.report && typeof parsed.report === 'object') {
      return parsed.report;
    }
  } catch {
    /* salvage below */
  }
  const gaps = extractJsonArrayField(body, 'gaps');
  const findings = extractJsonArrayField(body, 'findings');
  const summaryMatch = body.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (!summaryMatch && !gaps?.length && !findings?.length) return null;
  let summaryText = summaryMatch ? summaryMatch[1] : '';
  if (summaryMatch) {
    try {
      summaryText = JSON.parse(`"${summaryMatch[1]}"`);
    } catch {
      summaryText = summaryMatch[1];
    }
  }
  const postureMatch = body.match(/"overallPosture"\s*:\s*"([^"]+)"/i);
  const base = {
    requiresAction: /"requiresAction"\s*:\s*true/.test(body),
    summary: summaryText || undefined,
    limitations: ['Partial recovery from truncated or invalid finish JSON.']
  };
  if (postureMatch) base.overallPosture = postureMatch[1];
  if (gaps?.length) base.gaps = gaps;
  if (findings?.length) base.findings = findings;
  if (!base.summary && !base.gaps && !base.findings) return null;
  return base;
}

function displaySummary(report) {
  const s = String(report?.summary || '').trim();
  if (!s) return '';
  if (s.startsWith('{')) {
    const salvaged = extractFinishReport(s);
    if (salvaged?.summary && typeof salvaged.summary === 'string') {
      return salvaged.summary;
    }
    try {
      const j = JSON.parse(s);
      if (j?.report?.summary) return String(j.report.summary);
      if (typeof j.summary === 'string' && j.type === 'finish') return j.summary;
    } catch {
      return 'Structured agent output could not be parsed. See Raw for the full payload.';
    }
  }
  return s;
}

function isJsonLikeSummary(report) {
  const s = String(report?.summary || '').trim();
  return s.startsWith('{') && s.includes('"');
}

function prettyJsonString(text) {
  try {
    return JSON.stringify(JSON.parse(String(text)), null, 2);
  } catch {
    return null;
  }
}

module.exports = {
  parseAgentJson,
  extractFinishReport,
  extractJsonArrayField,
  displaySummary,
  isJsonLikeSummary,
  prettyJsonString
};
