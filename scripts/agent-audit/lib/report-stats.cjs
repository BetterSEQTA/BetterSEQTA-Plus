'use strict';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const SEV_WEIGHT = { critical: 25, high: 15, medium: 5, low: 1, info: 0 };

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function healthFromFindings(findings, filterFn) {
  const list = (findings || []).filter(filterFn || (() => true));
  let penalty = 0;
  for (const f of list) {
    const sev = String(f.severity || 'info').toLowerCase();
    penalty += SEV_WEIGHT[sev] ?? 0;
  }
  return clamp(100 - penalty, 0, 100);
}

function countBySeverity(items, key = 'severity') {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const item of items || []) {
    const sev = String(item[key] || 'info').toLowerCase();
    if (counts[sev] != null) counts[sev] += 1;
  }
  return counts;
}

function computeSecurityStats(report) {
  const findings = report.findings || [];
  const sevCounts = countBySeverity(findings);
  const total = findings.length;
  const findingsUnknown = !!report.structuredFindingsMissing;
  return {
    mode: 'security',
    requiresAction: !!report.requiresAction,
    totalFindings: total,
    findingsUnknown,
    severityCounts: sevCounts,
    rings: findingsUnknown
      ? [
          { id: 'overall', label: 'Overall health', score: null, unknown: true },
          { id: 'security', label: 'Exploit surface', score: null, unknown: true },
          { id: 'stability', label: 'Stability', score: null, unknown: true },
          { id: 'deps', label: 'Dependencies', score: null, unknown: true },
          {
            id: 'action',
            label: 'Action clear',
            score: report.requiresAction ? 25 : null,
            unknown: !report.requiresAction
          }
        ]
      : [
          { id: 'overall', label: 'Overall health', score: healthFromFindings(findings) },
          { id: 'security', label: 'Exploit surface', score: healthFromFindings(findings, (f) => f.category === 'security') },
          { id: 'stability', label: 'Stability', score: healthFromFindings(findings, (f) => ['crash', 'reliability'].includes(f.category)) },
          { id: 'deps', label: 'Dependencies', score: healthFromFindings(findings, (f) => f.category === 'dependency') },
          {
            id: 'action',
            label: 'Action clear',
            score: report.requiresAction ? 25 : 100
          }
        ],
    donut: {
      segments: SEVERITIES.map((s) => ({ label: s, value: sevCounts[s] || 0 }))
    }
  };
}

function computeSoc2Stats(report) {
  const gaps = report.gaps || [];
  const sevCounts = countBySeverity(gaps);
  const statusCounts = { fail: 0, partial: 0, pass: 0 };
  for (const g of gaps) {
    const st = String(g.status || 'pass').toLowerCase();
    if (statusCounts[st] != null) statusCounts[st] += 1;
  }
  const posture = String(report.overallPosture || 'yellow').toLowerCase();
  const postureScore = posture === 'green' ? 92 : posture === 'red' ? 35 : 68;
  const attestation = (report.attestationNeeded || []).length;
  const gapsUnknown = !!report.structuredGapsMissing;
  const unknownRing = (label, id) => ({ id, label, score: null, unknown: true });
  return {
    mode: 'soc2',
    requiresAction: !!report.requiresAction,
    overallPosture: posture,
    totalGaps: gaps.length,
    severityCounts: sevCounts,
    statusCounts,
    gapsUnknown,
    rings: gapsUnknown
      ? [
          { id: 'compliance', label: 'Compliance health', score: postureScore },
          unknownRing('Controls failing', 'fail'),
          unknownRing('Partial gaps', 'partial'),
          unknownRing('Attestation', 'attest'),
          {
            id: 'action',
            label: 'Action clear',
            score: report.requiresAction ? 25 : null,
            unknown: !report.requiresAction
          }
        ]
      : [
          { id: 'compliance', label: 'Compliance health', score: postureScore },
          { id: 'fail', label: 'Controls failing', score: clamp(100 - statusCounts.fail * 12, 0, 100) },
          { id: 'partial', label: 'Partial gaps', score: clamp(100 - statusCounts.partial * 8, 0, 100) },
          {
            id: 'attest',
            label: 'Attestation',
            score: clamp(100 - attestation * 10, 0, 100)
          },
          {
            id: 'action',
            label: 'Action clear',
            score: report.requiresAction ? 25 : 100
          }
        ],
    donut: {
      segments: [
        { label: 'fail', value: statusCounts.fail },
        { label: 'partial', value: statusCounts.partial },
        { label: 'pass', value: statusCounts.pass }
      ]
    }
  };
}

function computeDashboardStats(mode, report) {
  if (mode === 'soc2') return computeSoc2Stats(report);
  return computeSecurityStats(report);
}

function parseTranscriptJsonl(text) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      /* skip bad line */
    }
  }
  return entries;
}

function readTranscriptFile(filePath, fs) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  return parseTranscriptJsonl(fs.readFileSync(filePath, 'utf8'));
}

/** Audit finding/gap ids (F1, G2). Uppercase only so hex char classes like [a-f0-9] do not match f0. */
const FINDING_ID_RE = /\b([FG][0-9]{1,4})\b/;

function extractFindingRef(text, validIds) {
  const m = String(text || '').match(FINDING_ID_RE);
  if (!m) return null;
  const ref = m[1];
  if (validIds instanceof Set && validIds.size > 0 && !validIds.has(ref)) {
    return null;
  }
  return ref;
}

function collectReportItemIds(mode, report) {
  const ids = new Set();
  const list = mode === 'soc2' ? report?.gaps : report?.findings;
  if (!Array.isArray(list)) return ids;
  for (let i = 0; i < list.length; i += 1) {
    const id = list[i]?.id;
    if (id) ids.add(String(id));
    else ids.add(mode === 'soc2' ? `G${i + 1}` : `F${i + 1}`);
  }
  return ids;
}

function timelineSummary(entry) {
  if (entry.role === 'tool' && entry.name) {
    const args = entry.args || {};
    if (entry.name === 'read_file' && args.filePath) {
      const range =
        args.startLine != null ? ` L${args.startLine}-${args.endLine || '?'}` : '';
      return `read_file ${args.filePath}${range}`;
    }
    if (entry.name === 'file_info' && args.filePath) return `file_info ${args.filePath}`;
    if ((entry.name === 'grep' || entry.name === 'search_files') && args.pattern) {
      return `${entry.name} ${String(args.pattern).slice(0, 80)}`;
    }
    if (entry.name === 'read_context_section' && args.key) return `read_context_section ${args.key}`;
    if (entry.name === 'write_scratch' && args.name) return `write_scratch ${args.name}`;
    if (entry.name === 'read_scratch') return args.name ? `read_scratch ${args.name}` : 'read_scratch list';
    if (entry.name === 'list_files' && args.prefix) return `list_files ${args.prefix}`;
    return `Tool: ${entry.name}`;
  }
  if (entry.role === 'error') {
    return `Error: ${String(entry.message || '').slice(0, 120)}`;
  }
  if (entry.role === 'system') {
    return String(entry.content || 'system');
  }
  if (entry.role === 'assistant') {
    return String(entry.content || '').slice(0, 160);
  }
  return entry.role || 'event';
}

function isFlaggedEvent(entry) {
  if (entry.role === 'error') return true;
  if (entry.role === 'tool' && ['grep', 'read_file'].includes(entry.name)) {
    const blob = JSON.stringify(entry.content || entry.args || '');
    if (/eval|password|secret|requireHostType|sql|XSS/i.test(blob)) return true;
  }
  const text = String(entry.content || '');
  if (FINDING_ID_RE.test(text)) return true;
  return false;
}

function buildScratchRevisionsFromTranscript(transcriptEntries) {
  const revisions = [];
  let revisionIndex = 0;
  for (const e of transcriptEntries) {
    if (e.role !== 'tool') continue;
    const args = e.args && typeof e.args === 'object' ? e.args : {};
    if (e.name === 'write_scratch') {
      const noteName = args.name;
      if (!noteName || args.content == null) continue;
      revisionIndex += 1;
      const content = String(args.content);
      revisions.push({
        ts: e.ts || '',
        turn: e.turn,
        name: String(noteName),
        action: args.append ? 'append' : 'write',
        append: !!args.append,
        content,
        bytes: Buffer.byteLength(content, 'utf8'),
        revisionIndex,
        source: 'transcript'
      });
      continue;
    }
    if (e.name === 'delete_scratch' && args.name) {
      revisionIndex += 1;
      revisions.push({
        ts: e.ts || '',
        turn: e.turn,
        name: String(args.name),
        action: 'delete',
        append: false,
        content: '',
        bytes: 0,
        revisionIndex,
        source: 'transcript'
      });
    }
  }
  return revisions;
}

function countScratchEdits(transcriptEntries, scratchRevisions) {
  if (Array.isArray(scratchRevisions) && scratchRevisions.length) return scratchRevisions.length;
  return buildScratchRevisionsFromTranscript(transcriptEntries).length;
}

function buildTimelineEvents(transcriptEntries, options = {}) {
  const validIds = options.validIds instanceof Set ? options.validIds : null;
  return transcriptEntries.map((entry, index) => ({
    index,
    ts: entry.ts || '',
    turn: entry.turn ?? null,
    role: entry.role || 'unknown',
    name: entry.name || null,
    args: entry.args || null,
    content: String(entry.content || ''),
    contentPreview: entry.contentPreview ? String(entry.contentPreview) : null,
    revisionIndex: entry.revisionIndex != null ? entry.revisionIndex : null,
    summary: timelineSummary(entry),
    flagged: isFlaggedEvent(entry),
    findingRef: extractFindingRef(entry.content, validIds)
  }));
}

function computeAgentMetrics(transcriptEntries, meta = {}) {
  let toolCalls = 0;
  let parseRetries = 0;
  let errors = 0;
  let maxTurn = 0;
  for (const e of transcriptEntries) {
    if (e.role === 'tool') toolCalls += 1;
    if (e.role === 'system' && e.content === 'parse_error_retry') parseRetries += 1;
    if (e.role === 'error') errors += 1;
    if (typeof e.turn === 'number') maxTurn = Math.max(maxTurn, e.turn + 1);
  }
  const times = transcriptEntries.map((e) => Date.parse(e.ts)).filter((t) => !Number.isNaN(t));
  let durationMs = null;
  if (times.length >= 2) {
    durationMs = Math.max(...times) - Math.min(...times);
  }
  const scratchEdits = countScratchEdits(transcriptEntries, meta.scratchRevisions);
  return {
    turnsUsed: meta.turnsUsed ?? maxTurn,
    toolCalls,
    parseRetries,
    errors,
    durationMs,
    eventCount: transcriptEntries.length,
    scratchEdits
  };
}

module.exports = {
  escapeHtml,
  computeDashboardStats,
  computeSecurityStats,
  computeSoc2Stats,
  parseTranscriptJsonl,
  readTranscriptFile,
  buildTimelineEvents,
  buildScratchRevisionsFromTranscript,
  computeAgentMetrics,
  healthFromFindings,
  countBySeverity,
  FINDING_ID_RE,
  extractFindingRef,
  collectReportItemIds
};
