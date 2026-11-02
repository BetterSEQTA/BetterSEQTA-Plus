# Agent optimization audit (CI)

Monthly maintainability review: dead code, duplication, complexity, bundle/performance, and actionable test gaps.

## Schedule

- **Workflow:** `.github/workflows/agent-audit-optimization.yml`
- **Cron:** `0 6 2 * *` with **`timezone: Australia/Adelaide`** (2nd of each month at **06:00** local, day after the security audit)
- **Manual:** Actions → **Agent audit (optimization)** → Run workflow

Same fork policy and secrets as [AGENT_AUDIT.md](./AGENT_AUDIT.md) (`AGENT_AUDIT_API_KEY`, `AGENT_AUDIT_DISCORD_WEBHOOK_URL`).

## Local run

```bash
export AGENT_AUDIT_API_KEY=...
export AGENT_AUDIT_DISCORD_WEBHOOK_URL=...   # optional locally
npm run audit:agent:optimization
```

Artifacts at repo root by default:

| Artifact | File |
|----------|------|
| JSON | `optimization-audit-report.json` |
| Markdown | `optimization-audit-report.md` |
| Dashboard | `optimization-audit-report.html` |
| Transcript | `optimization-audit-transcript.jsonl` |

Preview HTML without an API key:

```bash
npm run audit:dashboard:preview -- --mode optimization
```

Writes `optimization-audit-report.preview.html`.
