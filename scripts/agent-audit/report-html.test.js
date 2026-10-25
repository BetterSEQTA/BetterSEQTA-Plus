const fs = require('fs');
const path = require('path');
const {
  escapeHtml,
  computeSecurityStats,
  computeSoc2Stats,
  parseTranscriptJsonl,
  buildTimelineEvents,
  buildScratchRevisionsFromTranscript,
  computeAgentMetrics,
  extractFindingRef,
  collectReportItemIds
} = require('./lib/report-stats.cjs');

describe('agentAuditHtml', () => {
  it('escapeHtml neutralizes XSS', () => {
    expect(escapeHtml('<script>"\'&</script>')).toBe(
      '&lt;script&gt;&quot;&#39;&amp;&lt;/script&gt;'
    );
  });

  it('computeSecurityStats produces rings and donut', () => {
    const report = {
      requiresAction: true,
      findings: [
        { severity: 'critical', category: 'security' },
        { severity: 'low', category: 'dependency' }
      ]
    };
    const stats = computeSecurityStats(report);
    expect(stats.rings.length).toBe(5);
    expect(stats.donut.segments.find((s) => s.label === 'critical').value).toBe(1);
    expect(stats.rings[0].score).toBeLessThan(100);
  });

  it('computeSoc2Stats maps posture and status counts', () => {
    const stats = computeSoc2Stats({
      requiresAction: true,
      overallPosture: 'yellow',
      gaps: [
        { status: 'fail', severity: 'high' },
        { status: 'pass', severity: 'info' }
      ],
      attestationNeeded: ['a', 'b']
    });
    expect(stats.statusCounts.fail).toBe(1);
    expect(stats.rings.length).toBe(5);
  });

  it('does not treat hex charset f0 as finding id F0', () => {
    const toolContent = 'FINGERPRINT_ID_RE = /^[a-f0-9]{16,64}$/i';
    expect(extractFindingRef(toolContent)).toBe(null);
    const events = buildTimelineEvents([
      { role: 'tool', name: 'read_file', content: toolContent, turn: 1 }
    ]);
    expect(events[0].findingRef).toBe(null);
    expect(events[0].flagged).toBe(false);
  });

  it('findingRef links only ids present in the report', () => {
    const validIds = collectReportItemIds('security', {
      findings: [
        { id: 'F1', title: 'a' },
        { id: 'F2', title: 'b' }
      ]
    });
    expect(extractFindingRef('see F1 and F99', validIds)).toBe('F1');
    expect(extractFindingRef('see F99 only', validIds)).toBe(null);
  });

  it('parseTranscriptJsonl and timeline flags', () => {
    const fixture = path.join(__dirname, 'fixtures', 'sample-transcript.jsonl');
    const entries = parseTranscriptJsonl(fs.readFileSync(fixture, 'utf8'));
    expect(entries.length).toBeGreaterThanOrEqual(4);
    const events = buildTimelineEvents(entries);
    const flagged = events.filter((e) => e.flagged);
    expect(flagged.length).toBeGreaterThanOrEqual(1);
    const metrics = computeAgentMetrics(entries, { turnsUsed: 4 });
    expect(metrics.toolCalls).toBe(3);
    const revisions = buildScratchRevisionsFromTranscript(entries);
    expect(revisions.length).toBe(1);
    expect(revisions[0].name).toBe('checklist');
  });

});
