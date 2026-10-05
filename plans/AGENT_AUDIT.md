# Agent security and stability audit (CI)

Scheduled GitHub Actions job that runs an agentic review of BetterSEQTA+ for exploits, vulnerabilities, and reliability risks in the browser extension.

## Schedule

- **Cron:** `0 6 * * 5` with **`timezone: Australia/Adelaide`** (Fridays at **06:00** local)
- **Manual:** Actions → **Agent audit** → Run workflow

## Where it runs (fork policy)

The workflow runs only on **`BetterSEQTA/BetterSEQTA-Plus`**.

Forks skip the job unless the fork sets repository variable **`AGENT_AUDIT_ALLOW_FORKS`** to `true` (Settings → Secrets and variables → Actions → Variables). The same value is passed to `AGENT_AUDIT_ALLOW_FORKS` for the CLI guard in `run.mjs`.

Local runs without `GITHUB_REPOSITORY` are not blocked. To simulate fork opt-in locally: `AGENT_AUDIT_ALLOW_FORKS=1`.

## Secrets (repository → Settings → Secrets and variables → Actions)

| Secret | Purpose |
|--------|---------|
| `AGENT_AUDIT_API_KEY` | Bearer token for `https://9router.stroepwafel.au/v1` |
| `AGENT_AUDIT_DISCORD_WEBHOOK_URL` | Incoming webhook for security audit alerts |

## Workflow env (non-secret)

| Variable | Default |
|----------|---------|
| `AGENT_AUDIT_BASE_URL` | `https://9router.stroepwafel.au/v1` |
| `AGENT_AUDIT_MODEL` | `fast` |
| `AGENT_AUDIT_MAX_TURNS` | `250` |
| `AGENT_AUDIT_MIN_TURNS` | `25` |
| `AGENT_AUDIT_MIN_FINISH_TURNS` | `32` |
| `AGENT_AUDIT_MAX_TOKENS` | `8192` |
| `AGENT_AUDIT_MAX_TOKENS_TOOL` | `512` |
| `AGENT_AUDIT_MAX_TOKENS_FINISH` | `8192` |
| `AGENT_AUDIT_EMBED_INDEX` | `1` in CI (preload context index) |
| `AGENT_AUDIT_COMPACT_TOOL_DOC` | `1` in CI (compact tool reference) |
| `AGENT_AUDIT_GIT_DELTA` | `1` in CI (prioritize last-commit file list) |
| `AGENT_AUDIT_TRIM_MAX_MESSAGES` | `36` |
| `AGENT_AUDIT_READ_MAX_BYTES` | `12000` (read_file tool) |
| `AGENT_AUDIT_GREP_MAX_MATCHES` | `40` |
| `AGENT_AUDIT_TRIM_MESSAGES` | trim long chat history (set `0` to disable) |
| `AGENT_AUDIT_LLM_RETRIES` | `3` |
| `AGENT_AUDIT_LLM_TIMEOUT_MS` | `540000` (9 minutes) |
| `AGENT_AUDIT_DISCORD_ATTACH_HTML` | `1` in CI (attach HTML to webhook) |

CI logs prefix lines with `[audit ISO timestamp]`. On LLM failure, the job still writes report JSON/MD/HTML with an `llmError` block (job exits 1; download artifacts).

## Local run

```bash
export AGENT_AUDIT_API_KEY=...
export AGENT_AUDIT_DISCORD_WEBHOOK_URL=...   # optional locally
npm run audit:agent
```

Artifacts at repo root by default: `agent-audit-report.json`, `agent-audit-report.md`, `agent-audit-report.html`, `agent-audit-transcript.jsonl`.

Preview HTML without an API key: `npm run audit:dashboard:preview` (see `plans/AGENT_AUDIT_HTML.md`).

Connectivity smoke test: `npm run audit:probe`.

Agent replies use `{"type":"tool",...}`, `{"type":"batch","tools":[...]}` (up to 6 parallel tools), or `{"type":"finish","report":{...}}`. Native multi `tool_calls` from the router map to batch automatically.

## Discord

Embed when findings need action: critical/high severity, or medium security/crash with confidence not low.

With `AGENT_AUDIT_DISCORD_ATTACH_HTML=1`, CI uploads `agent-audit-report.html` to the webhook after every run. Optional `AUDIT_HTML_PUBLISH_PUT_URL` for presigned R2/S3 upload.

## Checkpoints

- [x] Workflow `.github/workflows/agent-audit.yml`
- [x] `npm run audit:agent`
- [x] Unit tests: Jest (`scripts/agent-audit/lib/*.test.js`) + `npm run test:agent-audit` (ESM harness)
- [ ] Operator: secrets on canonical repo; one successful `workflow_dispatch`
- [ ] Operator: confirm Discord ping when actionable findings exist
