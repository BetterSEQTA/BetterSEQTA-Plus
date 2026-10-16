'use strict';

const {
  extractFinishReport,
  displaySummary,
  isJsonLikeSummary,
  extractJsonArrayField
} = require('./agent-json.cjs');

const STATUS_ALIASES = {
  fail: new Set(['fail', 'failed', 'failure', 'non_compliant', 'non-compliant', 'noncompliant', 'no']),
  partial: new Set(['partial', 'partially', 'in_progress', 'in-progress', 'yellow']),
  pass: new Set(['pass', 'passed', 'ok', 'compliant', 'green', 'yes'])
};

function normalizeGapStatus(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (STATUS_ALIASES.fail.has(s)) return 'fail';
  if (STATUS_ALIASES.partial.has(s)) return 'partial';
  if (STATUS_ALIASES.pass.has(s)) return 'pass';
  if (s) return s;
  return 'partial';
}

function normalizeGapRow(g) {
  if (!g || typeof g !== 'object') return null;
  const title = g.title || g.name || g.control || g.description;
  if (!title && !g.criterion && !g.id) return null;
  return {
    ...g,
    id: g.id || g.controlId || '',
    title: title || 'Untitled gap',
    status: normalizeGapStatus(g.status ?? g.result ?? g.controlStatus),
    severity: String(g.severity || 'medium').toLowerCase()
  };
}

function coalesceGaps(report) {
  const candidates = [report.gaps, report.controls, report.gapItems, report.issues, report.findings];
  for (const list of candidates) {
    if (Array.isArray(list) && list.length) return list;
  }
  return [];
}

function salvageGapsFromText(text) {
  const body = String(text || '');
  if (!body) return [];
  const fromArray = extractJsonArrayField(body, 'gaps');
  if (Array.isArray(fromArray) && fromArray.length) return fromArray;
  const parsed = extractFinishReport(body);
  if (Array.isArray(parsed?.gaps) && parsed.gaps.length) return parsed.gaps;
  return [];
}

function salvageFindingsFromText(text) {
  const body = String(text || '');
  if (!body) return [];
  const fromArray = extractJsonArrayField(body, 'findings');
  if (Array.isArray(fromArray) && fromArray.length) return fromArray;
  const parsed = extractFinishReport(body);
  if (Array.isArray(parsed?.findings) && parsed.findings.length) return parsed.findings;
  return [];
}

function summaryImpliesGaps(summary) {
  const s = String(summary || '');
  return (
    /\bgaps?\b/i.test(s) &&
    (/multiple gaps|found several|CC\d+\.\d|fail\/partial|controls failing|gap review/i.test(s) ||
      /across CC/i.test(s))
  );
}

function inferStructuredGapsMissing(mode, report, gaps) {
  if (mode !== 'soc2') return false;
  if (gaps.length > 0) return false;
  if (report.structuredGapsRecovered) return false;
  const posture = String(report.overallPosture || '').toLowerCase();
  if (posture === 'yellow' || posture === 'red') return true;
  if (Array.isArray(report.attestationNeeded) && report.attestationNeeded.length > 0) return true;
  if (summaryImpliesGaps(report.summary)) return true;
  return false;
}

/**
 * Normalize agent report JSON for storage, stats, and HTML (security + SOC2).
 */
function normalizeAuditReport(mode, report) {
  if (!report || typeof report !== 'object') return report || {};

  let next = { ...report };

  if (isJsonLikeSummary(next)) {
    const salvaged = extractFinishReport(String(next.summary || ''));
    if (salvaged) {
      next = {
        ...next,
        ...salvaged,
        summary:
          typeof salvaged.summary === 'string' ? salvaged.summary : displaySummary(next),
        findings: salvaged.findings ?? next.findings,
        gaps: salvaged.gaps ?? next.gaps
      };
    } else {
      next = { ...next, summary: displaySummary(next) };
    }
  }

  if (mode === 'soc2') {
    let gaps = coalesceGaps(next);
    if (!gaps.length && next.rawAssistantOutput) {
      gaps = salvageGapsFromText(next.rawAssistantOutput);
      if (gaps.length) next.structuredGapsRecovered = true;
    }
    if (!gaps.length) {
      gaps = salvageGapsFromText(next.summary);
      if (gaps.length) next.structuredGapsRecovered = true;
    }
    next.gaps = gaps.map(normalizeGapRow).filter(Boolean);
    next.structuredGapsMissing = inferStructuredGapsMissing(mode, next, next.gaps);
  } else {
    let findings = Array.isArray(next.findings) ? next.findings : [];
    if (!findings.length && next.rawAssistantOutput) {
      findings = salvageFindingsFromText(next.rawAssistantOutput);
      if (findings.length) next.structuredFindingsRecovered = true;
    }
    if (!findings.length) {
      findings = salvageFindingsFromText(next.summary);
      if (findings.length) next.structuredFindingsRecovered = true;
    }
    next.findings = findings;
    if (!findings.length && summaryImpliesGaps(next.summary)) {
      next.structuredFindingsMissing = true;
    }
  }

  return next;
}

module.exports = {
  normalizeAuditReport,
  normalizeGapStatus,
  summaryImpliesGaps
};
