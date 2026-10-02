# Agent audit HTML dashboard

Self-contained HTML reports for CI artifacts and local preview (security mode).

## Preview locally (no API key)

```bash
npm run audit:dashboard:preview
npm run audit:dashboard:preview -- --open
```

Writes `agent-audit-report.preview.html` in repo root (or `AUDIT_OUTPUT_DIR`).

## Live audit outputs

| Artifact | File |
|----------|------|
| JSON | `agent-audit-report.json` |
| Markdown | `agent-audit-report.md` |
| Dashboard | `agent-audit-report.html` |
| Transcript | `agent-audit-transcript.jsonl` |

## Dashboard tabs

1. **Overview** – Overall score ring, severity donut, KPI tiles, executive summary.
2. **Findings** – Filter bar, expandable rows, export for agent (markdown/JSON). Schema: `betterseqta-audit-agent-export/v1`.
3. **Agent run** – Tool/assistant timeline and metrics from the transcript.
4. **Raw** – Full report JSON sections.

UI uses DM Sans + IBM Plex Sans on a zinc dark shell with BetterSEQTA+ blue accent (`#007bff`). Regenerate after CSS edits: `npm run audit:dashboard:preview`.

## Checkpoints

- [x] `report-html.mjs`, fixtures, preview command
- [x] CI workflow uploads `.html`
- [ ] Operator: open preview in browser after pull
- [ ] Operator: CI artifact contains dashboard after audit run
