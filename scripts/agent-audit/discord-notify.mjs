import {
  chunkDiscordEmbeds,
  isValidDiscordWebhookUrl,
  requiresDiscordNotify
} from './lib/audit-cjs.mjs';

export async function notifyDiscordIfNeeded({ mode, report, webhookUrl, runUrl, htmlArtifactName }) {
  const url = String(webhookUrl || '').trim();
  if (!requiresDiscordNotify(mode, report)) {
    return { sent: false, reason: 'no_action_required' };
  }
  if (!url) {
    return { sent: false, reason: 'webhook_not_configured' };
  }
  if (!isValidDiscordWebhookUrl(url)) {
    throw new Error('Invalid Discord webhook URL shape');
  }

  const payload = chunkDiscordEmbeds(mode, report, runUrl, htmlArtifactName || '');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord webhook HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return { sent: true };
}
