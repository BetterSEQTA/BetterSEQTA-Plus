'use strict';

const DISCORD_WEBHOOK_RE =
  /^https:\/\/(?:discord(?:app)?\.com|canary\.discord\.com)\/api\/webhooks\/\d+\/[\w-]+$/i;

const EMBED_DESC_MAX = 4096;
const EMBED_FIELD_VALUE_MAX = 1024;

function truncate(text, max) {
  const s = String(text || '');
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function isValidDiscordWebhookUrl(url) {
  return DISCORD_WEBHOOK_RE.test(String(url || '').trim());
}

function requiresDiscordNotifySecurity(report) {
  if (!report || typeof report !== 'object') return false;
  if (report.requiresAction === true) return true;
  if (report.requiresAction === false) return false;
  const findings = Array.isArray(report.findings) ? report.findings : [];
  for (const f of findings) {
    const sev = String(f.severity || '').toLowerCase();
    const cat = String(f.category || '').toLowerCase();
    const conf = String(f.confidence || 'medium').toLowerCase();
    if (sev === 'critical' || sev === 'high') return true;
    if (sev === 'medium' && (cat === 'security' || cat === 'crash') && conf !== 'low') {
      return true;
    }
  }
  return false;
}

function requiresDiscordNotifySoc2(report) {
  if (!report || typeof report !== 'object') return false;
  const posture = String(report.overallPosture || '').toLowerCase();
  const gaps = Array.isArray(report.gaps) ? report.gaps : [];
  if (posture === 'red') return true;
  if (report.structuredGapsMissing && (posture === 'yellow' || posture === 'red')) {
    return true;
  }
  if (posture === 'yellow' && gaps.length === 0) {
    return true;
  }
  if (Array.isArray(report.attestationNeeded) && report.attestationNeeded.length > 0) {
    return true;
  }
  for (const g of gaps) {
    const sev = String(g.severity || '').toLowerCase();
    const status = String(g.status || '').toLowerCase();
    if (sev === 'critical' || sev === 'high') return true;
    if (['critical', 'high', 'medium'].includes(sev) && ['fail', 'partial'].includes(status)) {
      return true;
    }
  }
  if (report.requiresAction === true) return true;
  if (report.requiresAction === false) return false;
  return false;
}

function requiresDiscordNotify(mode, report) {
  if (mode === 'soc2') return requiresDiscordNotifySoc2(report);
  return requiresDiscordNotifySecurity(report);
}

function maxSeveritySecurity(findings) {
  const order = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  let max = 0;
  for (const f of findings || []) {
    max = Math.max(max, order[String(f.severity || '').toLowerCase()] ?? 0);
  }
  if (max >= 4) return 'critical';
  if (max >= 3) return 'high';
  if (max >= 2) return 'medium';
  if (max >= 1) return 'low';
  return 'info';
}

function severityColor(severity) {
  const s = String(severity || '').toLowerCase();
  if (s === 'critical' || s === 'high') return 0xed4245;
  if (s === 'medium') return 0xfaa61a;
  if (s === 'low') return 0x5865f2;
  return 0x57f287;
}

function chunkText(text, maxLen) {
  const s = String(text || '');
  if (s.length <= maxLen) return [s];
  const chunks = [];
  let i = 0;
  while (i < s.length) {
    chunks.push(s.slice(i, i + maxLen));
    i += maxLen;
  }
  return chunks;
}

/**
 * Build Discord webhook payload embeds for security or SOC2 report.
 */
function chunkDiscordEmbeds(mode, report, runUrl, htmlArtifactName = '', options = {}) {
  const htmlAttached = !!options.htmlAttached;
  const username = mode === 'soc2' ? 'BetterSEQTA+ SOC2' : 'BetterSEQTA+ Audit';
  const embeds = [];

  if (mode === 'soc2') {
    const gaps = Array.isArray(report.gaps) ? report.gaps : [];
    const posture = report.overallPosture || 'unknown';
    const summary = report.summary || 'SOC2 weekly audit completed.';
    const color = severityColor(
      posture === 'red' ? 'critical' : posture === 'yellow' ? 'medium' : 'info'
    );
    embeds.push({
      title: `SOC2 gap review (${posture})`,
      description: truncate(summary, EMBED_DESC_MAX),
      color,
      url: runUrl || undefined,
      timestamp: new Date().toISOString()
    });
    const actionable = gaps.filter((g) => {
      const sev = String(g.severity || '').toLowerCase();
      const status = String(g.status || '').toLowerCase();
      if (sev === 'critical' || sev === 'high') return true;
      return ['fail', 'partial'].includes(status) && ['medium', 'high', 'critical'].includes(sev);
    });
    for (const g of actionable.slice(0, 8)) {
      const steps = Array.isArray(g.mitigationSteps) ? g.mitigationSteps.join('\n') : '';
      const body = [
        `**${g.criterion || ''}** ${g.title || ''}`,
        g.failureDescription ? `_${truncate(g.failureDescription, 500)}_` : '',
        steps ? `**Mitigate:**\n${truncate(steps, 800)}` : '',
        g.location ? `**Where:** ${truncate(g.location, 200)}` : ''
      ]
        .filter(Boolean)
        .join('\n');
      for (const part of chunkText(body, EMBED_DESC_MAX)) {
        embeds.push({
          title: truncate(`${g.id || 'G'} · ${g.severity || ''}`, 256),
          description: part,
          color: severityColor(g.severity)
        });
      }
    }
  } else {
    const findings = Array.isArray(report.findings) ? report.findings : [];
    const maxSev = maxSeveritySecurity(findings);
    embeds.push({
      title: 'Security and stability audit',
      description: truncate(report.summary || 'Audit completed.', EMBED_DESC_MAX),
      color: severityColor(maxSev),
      url: runUrl || undefined,
      timestamp: new Date().toISOString()
    });
    const actionable = findings.filter((f) => {
      const sev = String(f.severity || '').toLowerCase();
      const cat = String(f.category || '').toLowerCase();
      const conf = String(f.confidence || 'medium').toLowerCase();
      if (sev === 'critical' || sev === 'high') return true;
      return sev === 'medium' && (cat === 'security' || cat === 'crash') && conf !== 'low';
    });
    for (const f of actionable.slice(0, 10)) {
      const body = [
        `**${f.title || ''}** (${f.category || ''})`,
        f.exploitOrCrashScenario ? `Scenario: ${truncate(f.exploitOrCrashScenario, 400)}` : '',
        f.recommendedFix ? `Fix: ${truncate(f.recommendedFix, 400)}` : '',
        f.location ? `Location: ${truncate(f.location, 200)}` : ''
      ]
        .filter(Boolean)
        .join('\n');
      for (const part of chunkText(body, EMBED_DESC_MAX)) {
        embeds.push({
          title: truncate(`${f.id || 'F'} · ${f.severity || ''}`, 256),
          description: part,
          color: severityColor(f.severity)
        });
      }
    }
  }

  if (runUrl) {
    const artifactHint = htmlArtifactName
      ? htmlAttached
        ? `\n\nThe **${htmlArtifactName}** dashboard is attached to this message.`
        : `\n\nDownload the **${htmlArtifactName}** artifact from this run for the full tabbed dashboard.`
      : '';
    embeds.push({
      title: 'Workflow run',
      description: `${runUrl}${artifactHint}`,
      color: 0x5865f2
    });
  } else if (htmlArtifactName) {
    embeds.push({
      title: 'Dashboard artifact',
      description: `Download **${truncate(htmlArtifactName, 200)}** from the workflow artifacts for the full HTML report.`,
      color: 0x5865f2
    });
  }

  return { username, embeds: embeds.slice(0, 10) };
}

function syncRequiresAction(mode, report) {
  const next = { ...report };
  const { requiresAction: _ignored, ...forGate } = report || {};
  next.requiresAction = requiresDiscordNotify(mode, forGate);
  return next;
}

module.exports = {
  DISCORD_WEBHOOK_RE,
  isValidDiscordWebhookUrl,
  requiresDiscordNotify,
  requiresDiscordNotifySecurity,
  requiresDiscordNotifySoc2,
  chunkDiscordEmbeds,
  syncRequiresAction,
  truncate,
  EMBED_DESC_MAX,
  EMBED_FIELD_VALUE_MAX
};
