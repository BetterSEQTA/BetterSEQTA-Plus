import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  computeSecurityStats,
  computeSoc2Stats,
  parseTranscriptJsonl,
  buildTimelineEvents,
  computeAgentMetrics
} from './lib/audit-cjs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('agentAuditHtml (report-html.mjs)', () => {
  it('reportToHtml includes redesign markers and escapes summary', async () => {
    const { reportToHtml } = await import('./report-html.mjs');
    const report = {
      requiresAction: false,
      summary: '<img onerror=alert(1)>',
      findings: [{ id: 'F1', severity: 'info', category: 'other', title: 't', location: 'x.js' }]
    };
    const stats = computeSecurityStats(report);
    const html = reportToHtml('security', report, { stats, timelineEvents: [], metrics: {} });
    assert.ok(html.length > 8000);
    assert.match(html, /Overview/);
    assert.match(html, /BetterSEQTA\+/);
    assert.doesNotMatch(html, /<img onerror/);
    assert.match(html, /&lt;img onerror/);
  });

  it('reportToHtml renders CI run link without escaping anchor tags', async () => {
    const { reportToHtml } = await import('./report-html.mjs');
    const report = { requiresAction: false, summary: 'ok', findings: [] };
    const stats = computeSecurityStats(report);
    const html = reportToHtml('security', report, {
      stats,
      timelineEvents: [],
      metrics: {},
      runUrl: 'https://github.com/org/repo/actions/runs/1'
    });
    assert.match(html, /<a href="https:\/\/github\.com\/org\/repo\/actions\/runs\/1"/);
    assert.doesNotMatch(html, /&lt;a href/);
  });

  it('reportToHtml shows incomplete state when llmError set', async () => {
    const { reportToHtml } = await import('./report-html.mjs');
    const report = {
      requiresAction: false,
      summary: 'Audit stopped: x',
      llmError: { message: 'LLM returned reasoning only (empty content field)' },
      gaps: [],
      overallPosture: 'yellow'
    };
    const stats = computeSoc2Stats(report);
    const html = reportToHtml('soc2', report, { stats, timelineEvents: [], metrics: {} });
    assert.match(html, /Incomplete audit/);
  });

  it('reportToHtml findings tab includes agent export controls when items exist', async () => {
    const { reportToHtml } = await import('./report-html.mjs');
    const report = {
      requiresAction: true,
      summary: 'ok',
      findings: [{ id: 'F1', severity: 'high', category: 'security', title: 'Test issue' }]
    };
    const html = reportToHtml('security', report, { timelineEvents: [], metrics: {} });
    assert.match(html, /export-copy-md/);
    assert.match(html, /data-export="/);
  });

  it('reportToHtml agent panel has spine timeline icons', async () => {
    const { reportToHtml } = await import('./report-html.mjs');
    const fixture = path.join(__dirname, 'fixtures', 'sample-transcript.jsonl');
    const entries = parseTranscriptJsonl(fs.readFileSync(fixture, 'utf8'));
    const events = buildTimelineEvents(entries);
    const report = { requiresAction: true, summary: 'x', findings: [] };
    const stats = computeSecurityStats(report);
    const html = reportToHtml('security', report, {
      stats,
      timelineEvents: events,
      metrics: computeAgentMetrics(entries, { turnsUsed: 4 })
    });
    assert.match(html, /tl-spine/);
  });

  it('preview fixture includes scratch notes for dashboard demo', async () => {
    const { reportToHtml } = await import('./report-html.mjs');
    const fixture = path.join(__dirname, 'fixtures', 'sample-security-report.json');
    const report = JSON.parse(fs.readFileSync(fixture, 'utf8'));
    const html = reportToHtml('security', report, { timelineEvents: [], metrics: {} });
    assert.ok(Array.isArray(report.scratchNotes) && report.scratchNotes.length > 0);
    assert.match(html, /data-tab="scratch-checklist"/);
    assert.match(html, /id="panel-scratch-checklist"/);
    assert.match(html, /scratch-revision-stepper/);
  });

  it('reportToHtml gives each scratch note its own tab', async () => {
    const { reportToHtml } = await import('./report-html.mjs');
    const report = {
      requiresAction: false,
      summary: 'ok',
      findings: [],
      scratchNotes: [{ name: 'checklist', content: '- host: checked\n- api: checked' }]
    };
    const html = reportToHtml('security', report, { timelineEvents: [], metrics: {} });
    assert.match(html, /data-tab="scratch-checklist"/);
    assert.match(html, /host: checked/);
    assert.doesNotMatch(html, /Session scratch notes/);
  });
});
