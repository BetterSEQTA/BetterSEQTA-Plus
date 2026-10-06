const {
  requiresDiscordNotifySecurity,
  requiresDiscordNotifySoc2,
  requiresDiscordNotify,
  chunkDiscordEmbeds,
  isValidDiscordWebhookUrl,
  syncRequiresAction
} = require('./report-gate.cjs');

describe('agentAuditReport', () => {
  it('validates Discord webhook URL shape', () => {
    expect(isValidDiscordWebhookUrl('https://discord.com/api/webhooks/123/abc-def')).toBe(true);
    expect(isValidDiscordWebhookUrl('https://example.com/hook')).toBe(false);
  });

  it('security notify gate respects severity and category', () => {
    expect(requiresDiscordNotifySecurity({ requiresAction: false })).toBe(false);
    expect(
      requiresDiscordNotifySecurity({
        findings: [{ severity: 'high', category: 'security' }]
      })
    ).toBe(true);
    expect(
      requiresDiscordNotifySecurity({
        findings: [{ severity: 'medium', category: 'security', confidence: 'high' }]
      })
    ).toBe(true);
    expect(
      requiresDiscordNotifySecurity({
        findings: [{ severity: 'medium', category: 'security', confidence: 'low' }]
      })
    ).toBe(false);
    expect(
      requiresDiscordNotifySecurity({
        findings: [{ severity: 'low', category: 'security' }]
      })
    ).toBe(false);
  });

  it('SOC2 notify gate treats missing structured gaps with yellow posture as actionable', () => {
    expect(
      requiresDiscordNotifySoc2({
        structuredGapsMissing: true,
        overallPosture: 'yellow',
        gaps: []
      })
    ).toBe(true);
    expect(
      requiresDiscordNotifySoc2({
        overallPosture: 'yellow',
        gaps: []
      })
    ).toBe(true);
    expect(
      requiresDiscordNotifySoc2({
        overallPosture: 'green',
        gaps: []
      })
    ).toBe(false);
  });

  it('SOC2 notify gate respects status and severity', () => {
    expect(
      requiresDiscordNotifySoc2({
        gaps: [{ severity: 'medium', status: 'fail' }]
      })
    ).toBe(true);
    expect(
      requiresDiscordNotifySoc2({
        gaps: [{ severity: 'low', status: 'fail' }]
      })
    ).toBe(false);
    expect(
      requiresDiscordNotifySoc2({
        gaps: [{ severity: 'high', status: 'pass' }]
      })
    ).toBe(true);
    expect(
      requiresDiscordNotifySoc2({
        gaps: [{ severity: 'info', status: 'pass' }]
      })
    ).toBe(false);
  });

  it('requiresDiscordNotify dispatches by mode', () => {
    expect(
      requiresDiscordNotify('security', { findings: [{ severity: 'critical', category: 'crash' }] })
    ).toBe(true);
    expect(
      requiresDiscordNotify('soc2', { gaps: [{ severity: 'medium', status: 'partial' }] })
    ).toBe(true);
  });

  it('syncRequiresAction aligns flag with gate', () => {
    const synced = syncRequiresAction('security', {
      requiresAction: false,
      findings: [{ severity: 'critical', category: 'security' }]
    });
    expect(synced.requiresAction).toBe(true);
  });

  it('chunkDiscordEmbeds produces username and bounded embed list', () => {
    const payload = chunkDiscordEmbeds(
      'security',
      {
        summary: 'Test summary',
        findings: [
          {
            id: 'F1',
            severity: 'high',
            category: 'security',
            title: 'Sample',
            exploitOrCrashScenario: 'x',
            recommendedFix: 'y',
            location: 'src/background.ts'
          }
        ]
      },
      'https://github.com/org/repo/actions/runs/1'
    );
    expect(payload.username).toBe('BetterSEQTA+ Audit');
    expect(payload.embeds.length).toBeGreaterThanOrEqual(2);
    expect(payload.embeds.length).toBeLessThanOrEqual(10);
  });

  it('chunkDiscordEmbeds handles SOC2 gaps', () => {
    const payload = chunkDiscordEmbeds(
      'soc2',
      {
        summary: 'Weekly review',
        overallPosture: 'yellow',
        gaps: [
          {
            id: 'G1',
            severity: 'medium',
            status: 'fail',
            criterion: 'CC6.1',
            title: 'Access review',
            mitigationSteps: ['Document RBAC', 'Enable reviews']
          }
        ]
      },
      'https://github.com/org/repo/actions/runs/2'
    );
    expect(payload.username).toBe('BetterSEQTA+ SOC2');
    expect(payload.embeds.some((e) => e.title && e.title.includes('G1'))).toBe(true);
  });

  it('chunkDiscordEmbeds mentions HTML artifact when provided', () => {
    const payload = chunkDiscordEmbeds(
      'security',
      { summary: 'x', findings: [{ severity: 'high', category: 'security' }] },
      'https://github.com/org/repo/actions/runs/3',
      'agent-audit-report.html'
    );
    const runEmbed = payload.embeds.find((e) => e.title === 'Workflow run');
    expect(runEmbed.description.includes('agent-audit-report.html')).toBe(true);
  });
});
