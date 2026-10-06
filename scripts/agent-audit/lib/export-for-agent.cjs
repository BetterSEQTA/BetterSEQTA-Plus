'use strict';

const EXPORT_SCHEMA = 'betterseqta-audit-agent-export/v1';

function normalizeSecurityItem(f, index) {
  return {
    id: f.id || `F${index + 1}`,
    severity: String(f.severity || 'info').toLowerCase(),
    category: f.category || 'other',
    title: f.title || '',
    location: f.location || '',
    confidence: f.confidence || '',
    evidence: f.evidence || '',
    scenario: f.exploitOrCrashScenario || f.scenario || '',
    recommendedFix: f.recommendedFix || f.fix || ''
  };
}

function normalizeSoc2Item(g, index) {
  const steps = g.mitigationSteps;
  let mitigation = g.mitigation || '';
  if (Array.isArray(steps) && steps.length) {
    mitigation = steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
  }
  return {
    id: g.id || `G${index + 1}`,
    severity: String(g.severity || 'info').toLowerCase(),
    status: String(g.status || 'partial').toLowerCase(),
    criterion: g.criterion || '',
    criterionTitle: g.criterionTitle || '',
    title: g.title || '',
    location: g.location || '',
    evidence: g.evidence || '',
    failureDescription: g.failureDescription || '',
    mitigation,
    ownerHint: g.ownerHint || g.owner || '',
    effort: g.effort || '',
    confidence: g.confidence || ''
  };
}

function buildAgentExportItems(mode, report) {
  const raw = mode === 'soc2' ? report.gaps : report.findings;
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item, i) =>
    mode === 'soc2' ? normalizeSoc2Item(item, i) : normalizeSecurityItem(item, i)
  );
}

function buildAgentExportMeta(mode, report, meta = {}) {
  return {
    schema: EXPORT_SCHEMA,
    mode,
    generatedAt: meta.generatedAt || new Date().toISOString(),
    runUrl: meta.runUrl || '',
    summary: typeof meta.summary === 'string' ? meta.summary : String(report.summary || '').slice(0, 4000)
  };
}

function buildAgentExportBundle(mode, report, meta = {}) {
  const items = buildAgentExportItems(mode, report);
  return {
    ...buildAgentExportMeta(mode, report, meta),
    itemCount: items.length,
    items
  };
}

function filterExportItems(items, { severities, statuses } = {}) {
  const sevSet = severities instanceof Set ? severities : new Set(severities || []);
  const stSet = statuses instanceof Set ? statuses : new Set(statuses || []);
  return items.filter((item) => {
    if (sevSet.size && !sevSet.has(item.severity)) return false;
    if (stSet.size && item.status && !stSet.has(item.status)) return false;
    return true;
  });
}

function itemsToAgentMarkdown(mode, meta, items) {
  const lines = [];
  const auditLabel = mode === 'soc2' ? 'SOC 2 gap review' : 'security audit';
  lines.push(`# BetterSEQTA+ ${auditLabel} — coding agent import`);
  lines.push('');
  lines.push(
    'Paste this file into Cursor, OpenCode, or another coding agent. Fix each item with concrete repo changes.'
  );
  lines.push('');
  if (meta.runUrl) lines.push(`Audit CI run: ${meta.runUrl}`);
  if (meta.generatedAt) lines.push(`Report generated: ${meta.generatedAt}`);
  lines.push(`Exported items: ${items.length}`);
  lines.push('');
  if (meta.summary) {
    lines.push('## Executive summary');
    lines.push('');
    lines.push(String(meta.summary).trim());
    lines.push('');
  }
  for (const item of items) {
    lines.push('---');
    lines.push('');
    if (mode === 'soc2') {
      lines.push(`## ${item.id} — ${item.severity} — ${item.status} — ${item.title}`);
      if (item.criterion) {
        const ct = item.criterionTitle ? ` (${item.criterionTitle})` : '';
        lines.push(`**Criterion:** ${item.criterion}${ct}`);
      }
    } else {
      lines.push(`## ${item.id} — ${item.severity} — ${item.title}`);
      if (item.category) lines.push(`**Category:** ${item.category}`);
    }
    if (item.location) lines.push(`**Location:** \`${item.location}\``);
    if (item.confidence) lines.push(`**Confidence:** ${item.confidence}`);
    if (item.ownerHint) lines.push(`**Owner hint:** ${item.ownerHint}`);
    if (item.effort) lines.push(`**Effort:** ${item.effort}`);
    lines.push('');
    if (item.evidence) {
      lines.push('**Evidence:**');
      lines.push('');
      lines.push(item.evidence);
      lines.push('');
    }
    if (item.scenario) {
      lines.push('**Scenario:**');
      lines.push('');
      lines.push(item.scenario);
      lines.push('');
    }
    if (item.failureDescription) {
      lines.push('**Failure:**');
      lines.push('');
      lines.push(item.failureDescription);
      lines.push('');
    }
    const fix = item.recommendedFix || item.mitigation;
    if (fix) {
      lines.push('**Recommended fix / mitigation:**');
      lines.push('');
      lines.push(fix);
      lines.push('');
    }
  }
  return `${lines.join('\n').trim()}\n`;
}

function itemsToAgentJson(meta, items) {
  return JSON.stringify(
    {
      ...meta,
      itemCount: items.length,
      items
    },
    null,
    2
  );
}

function exportItemPayloadBase64(item) {
  return Buffer.from(JSON.stringify(item), 'utf8').toString('base64');
}

module.exports = {
  EXPORT_SCHEMA,
  normalizeSecurityItem,
  normalizeSoc2Item,
  buildAgentExportItems,
  buildAgentExportMeta,
  buildAgentExportBundle,
  filterExportItems,
  itemsToAgentMarkdown,
  itemsToAgentJson,
  exportItemPayloadBase64
};
