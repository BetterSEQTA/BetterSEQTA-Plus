const {
  extractFinishReport,
  displaySummary,
  prettyJsonString
} = require('./agent-json.cjs');

describe('agentAuditJson', () => {
  it('extractFinishReport parses finish envelope', () => {
    const report = extractFinishReport(
      JSON.stringify({
        type: 'finish',
        report: {
          requiresAction: true,
          summary: 'Human summary here.',
          findings: [{ id: 'F1', severity: 'high', category: 'security', title: 't' }]
        }
      })
    );
    expect(report.summary).toBe('Human summary here.');
    expect(report.findings.length).toBe(1);
  });

  it('displaySummary extracts prose from JSON summary field', () => {
    const s = displaySummary({
      summary: JSON.stringify({
        type: 'finish',
        report: { summary: 'Security audit complete.', requiresAction: true }
      })
    });
    expect(s).toBe('Security audit complete.');
  });

  it('prettyJsonString formats JSON', () => {
    const out = prettyJsonString('{"a":1}');
    expect(out).toMatch(/\n/);
  });
});
