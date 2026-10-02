import fs from 'fs';
import path from 'path';

/**
 * Post audit dashboard HTML to Discord as a file (works with private GitHub repos).
 */
export async function publishHtmlToDiscord({
  webhookUrl,
  htmlPath,
  filename,
  contentMessage,
  embedPayload = null
}) {
  const url = String(webhookUrl || '').trim();
  if (!url || !fs.existsSync(htmlPath)) {
    return { ok: false, reason: 'missing_webhook_or_file' };
  }
  const body = fs.readFileSync(htmlPath);
  if (body.length > 7.5 * 1024 * 1024) {
    return { ok: false, reason: 'file_too_large_for_discord' };
  }
  const payload = {
    content: contentMessage || `Audit dashboard: **${filename}** (open in browser).`,
    username: embedPayload?.username || 'SpotiQueue Audit'
  };
  if (embedPayload?.embeds?.length) {
    payload.embeds = embedPayload.embeds.slice(0, 10);
  }
  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));
  form.append('files[0]', new Blob([body], { type: 'text/html;charset=utf-8' }), filename);
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord file upload HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return { ok: true };
}

/**
 * PUT HTML to a pre-signed object URL (R2, S3, etc.). Operator rotates URL via secret.
 */
export async function publishHtmlViaPresignedPut({ putUrl, htmlPath }) {
  const url = String(putUrl || '').trim();
  if (!url || !fs.existsSync(htmlPath)) {
    return { ok: false, reason: 'missing_put_url_or_file' };
  }
  const body = fs.readFileSync(htmlPath);
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTML PUT HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return { ok: true };
}

export async function publishAuditHtmlArtifacts({
  mode,
  outDir,
  htmlBasename,
  webhookUrl,
  runUrl,
  report = null,
  embedPayload = null
}) {
  const htmlPath = path.join(outDir, htmlBasename);
  if (!fs.existsSync(htmlPath)) {
    return { discord: { ok: false, reason: 'no_html' }, put: { ok: false, reason: 'no_html' } };
  }

  const results = { discord: { ok: false, reason: 'skipped' }, put: { ok: false, reason: 'skipped' } };

  const attachDiscord = process.env.AGENT_AUDIT_DISCORD_ATTACH_HTML === '1';
  const putUrl = String(process.env.AUDIT_HTML_PUBLISH_PUT_URL || '').trim();

  if (attachDiscord && webhookUrl) {
    const msg = runUrl
      ? `Latest ${mode} audit dashboard (CI: ${runUrl})`
      : `Latest ${mode} audit dashboard`;
    results.discord = await publishHtmlToDiscord({
      webhookUrl,
      htmlPath,
      filename: htmlBasename,
      contentMessage: msg,
      embedPayload
    });
  } else if (attachDiscord) {
    results.discord = { ok: false, reason: 'webhook_not_configured' };
  }

  if (putUrl) {
    results.put = await publishHtmlViaPresignedPut({ putUrl, htmlPath });
    const publicBase = String(process.env.AUDIT_HTML_PUBLISH_PUBLIC_URL || '').trim();
    if (publicBase && results.put.ok) {
      results.put.publicUrl = publicBase.replace(/\/$/, '');
    }
  }

  return results;
}
