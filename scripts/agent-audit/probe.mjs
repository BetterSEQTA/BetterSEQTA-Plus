#!/usr/bin/env node
/** Minimal 9router connectivity check (same client as audit). */
import { createRequire } from 'module';
import { chatCompletion, buildAuthHeaders } from './llm-client.mjs';
import { auditLog } from './audit-log.mjs';

const require = createRequire(import.meta.url);
const { assertAgentAuditRepositoryAllowed } = require('./lib/repo-gate.cjs');
assertAgentAuditRepositoryAllowed();

const baseUrl = process.env.AGENT_AUDIT_BASE_URL || 'https://9router.stroepwafel.au/v1';
const model = process.env.AGENT_AUDIT_MODEL || 'fast';
const apiKey = String(process.env.AGENT_AUDIT_API_KEY || '').trim();

if (!apiKey) {
  console.error('Set AGENT_AUDIT_API_KEY');
  process.exit(1);
}

auditLog(`Probe GET ${baseUrl.replace(/\/$/, '')}/models`);
const modelsRes = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
  headers: buildAuthHeaders(apiKey)
});
const modelsText = await modelsRes.text();
auditLog(`Models HTTP ${modelsRes.status}, ${modelsText.slice(0, 300)}`);

auditLog('Probe chat/completions (tiny prompt, stream=' + (process.env.AGENT_AUDIT_LLM_STREAM !== '0') + ')');
const result = await chatCompletion({
  baseUrl,
  apiKey,
  model,
  maxTokens: 32,
  messages: [
    { role: 'user', content: 'Reply with exactly the word ok and nothing else.' }
  ],
  onLog: auditLog
});

auditLog(`Success: ${JSON.stringify(result.content.slice(0, 200))} (parseMode=${result.parseMode})`);
