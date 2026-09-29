#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildContext } from './collect-context.mjs';
import { runAgentLoop } from './agent-loop.mjs';
import { reportToMarkdown } from './report-markdown.mjs';
import { reportToHtml } from './report-html.mjs';
import { notifyDiscordIfNeeded } from './discord-notify.mjs';
import { publishAuditHtmlArtifacts } from './publish-html.mjs';
import {
  syncRequiresAction,
  normalizeAuditReport,
  computeDashboardStats,
  readTranscriptFile,
  buildTimelineEvents,
  computeAgentMetrics,
  collectReportItemIds
} from './lib/audit-cjs.mjs';
import { auditLog } from './audit-log.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { assertAgentAuditRepositoryAllowed } = require('./lib/repo-gate.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  let mode = 'security';
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--mode' && argv[i + 1]) {
      mode = argv[i + 1];
      i += 1;
    }
  }
  if (mode !== 'security' && mode !== 'soc2') {
    throw new Error(`Invalid --mode ${mode}`);
  }
  return { mode };
}

function buildRunUrl() {
  const server = process.env.GITHUB_SERVER_URL;
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  if (server && repo && runId) return `${server}/${repo}/actions/runs/${runId}`;
  return '';
}

function artifactBasenames(mode) {
  if (mode === 'soc2') {
    return {
      json: 'soc2-audit-report.json',
      md: 'soc2-audit-report.md',
      html: 'soc2-audit-report.html',
      transcript: 'soc2-audit-transcript.jsonl'
    };
  }
  return {
    json: 'agent-audit-report.json',
    md: 'agent-audit-report.md',
    html: 'agent-audit-report.html',
    transcript: 'agent-audit-transcript.jsonl'
  };
}

function writeReportFiles(mode, outDir, report, htmlMeta = {}) {
  const names = artifactBasenames(mode);
  const jsonPath = path.join(outDir, names.json);
  const mdPath = path.join(outDir, names.md);
  const htmlPath = path.join(outDir, names.html);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(mdPath, reportToMarkdown(mode, report), 'utf8');
  const stats = computeDashboardStats(mode, report);
  const html = reportToHtml(mode, report, {
    stats,
    timelineEvents: htmlMeta.timelineEvents || [],
    metrics: htmlMeta.metrics || {},
    runUrl: htmlMeta.runUrl || ''
  });
  fs.writeFileSync(htmlPath, html, 'utf8');
  return names;
}

async function main() {
  const { mode } = parseArgs(process.argv);
  assertAgentAuditRepositoryAllowed();
  const apiKey = String(process.env.AGENT_AUDIT_API_KEY || '').trim();
  if (!apiKey) {
    console.error('AGENT_AUDIT_API_KEY is required');
    process.exit(1);
  }

  const baseUrl = process.env.AGENT_AUDIT_BASE_URL || 'https://9router.stroepwafel.au/v1';
  const model = process.env.AGENT_AUDIT_MODEL || 'fast';
  const maxTurns = parseInt(process.env.AGENT_AUDIT_MAX_TURNS || '250', 10);
  const minTurns = parseInt(process.env.AGENT_AUDIT_MIN_TURNS || '25', 10);
  const outDir = process.env.AUDIT_OUTPUT_DIR || REPO_ROOT;
  const names = artifactBasenames(mode);

  const webhookEnv =
    mode === 'soc2' ? 'SOC2_AUDIT_DISCORD_WEBHOOK_URL' : 'AGENT_AUDIT_DISCORD_WEBHOOK_URL';
  const webhookUrl = process.env[webhookEnv] || '';

  const git = {
    sha: process.env.GITHUB_SHA || '',
    ref: process.env.GITHUB_REF || '',
    repository: process.env.GITHUB_REPOSITORY || ''
  };

  auditLog(
    `Starting ${mode} audit (model=${model}, minTurns=${minTurns}, maxTurns=${maxTurns}, base=${baseUrl})`
  );

  auditLog('Collecting static context (npm audit, ripgrep, policy excerpts)…');
  const context = await buildContext(mode, { git });
  auditLog('Context bundle ready');

  const transcriptPath = path.join(outDir, names.transcript);
  const transcriptStream = fs.createWriteStream(transcriptPath, { flags: 'w' });

  function logTranscript(entry) {
    transcriptStream.write(`${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`);
  }

  let report;
  let turnsUsed = 0;
  let jobFailed = false;

  try {
    const loopResult = await runAgentLoop({
      mode,
      context,
      repoRoot: REPO_ROOT,
      baseUrl,
      apiKey,
      model,
      minTurns,
      maxTurns,
      onLog: auditLog,
      onTranscriptLine: (line) => logTranscript(line)
    });
    report = loopResult.report;
    turnsUsed = loopResult.turnsUsed ?? 0;
    auditLog(`Agent loop finished in ${loopResult.durationMs ?? '?'}ms, turnsUsed=${turnsUsed}`);
  } catch (err) {
    jobFailed = true;
    auditLog(`Agent loop threw: ${err.message}`);
    report = {
      requiresAction: false,
      summary: `Audit crashed: ${err.message}`,
      findings: mode === 'soc2' ? undefined : [],
      gaps: mode === 'soc2' ? [] : undefined,
      limitations: [err.message]
    };
    if (mode === 'soc2') {
      report.overallPosture = 'yellow';
      report.strengths = [];
      report.attestationNeeded = [];
    }
  } finally {
    transcriptStream.end();
  }

  report = normalizeAuditReport(mode, report);
  if (report.structuredGapsRecovered) {
    auditLog('Recovered structured gaps from truncated assistant JSON');
  }
  if (report.structuredFindingsRecovered) {
    auditLog('Recovered structured findings from truncated assistant JSON');
  }
  if (report.structuredGapsMissing) {
    auditLog('SOC2 gaps missing from structured report (summary/posture only)');
  }
  report = syncRequiresAction(mode, report);
  if (report.llmError) {
    jobFailed = true;
    auditLog(`LLM error recorded in report: ${report.llmError.message}`);
  }

  const transcriptEntries = readTranscriptFile(transcriptPath, fs);
  const timelineEvents = buildTimelineEvents(transcriptEntries, {
    validIds: collectReportItemIds(mode, report)
  });
  const metrics = computeAgentMetrics(transcriptEntries, { turnsUsed });
  const runUrl = buildRunUrl();
  const written = writeReportFiles(mode, outDir, report, {
    timelineEvents,
    metrics,
    runUrl
  });
  auditLog(`Wrote ${written.json}, ${written.md}, ${written.html}, ${names.transcript}`);
  auditLog(`requiresAction=${report.requiresAction}`);

  const notify = await notifyDiscordIfNeeded({
    mode,
    report,
    webhookUrl,
    runUrl,
    htmlArtifactName: written.html
  });
  if (notify.sent) {
    auditLog('Discord notification sent');
  } else {
    auditLog(`Discord skipped: ${notify.reason}`);
  }

  try {
    const published = await publishAuditHtmlArtifacts({
      mode,
      outDir,
      htmlBasename: written.html,
      webhookUrl,
      runUrl
    });
    if (published.discord?.ok) {
      auditLog(`Discord HTML attached: ${written.html}`);
    } else if (process.env.AGENT_AUDIT_DISCORD_ATTACH_HTML === '1') {
      auditLog(`Discord HTML attach skipped: ${published.discord?.reason || 'unknown'}`);
    }
    if (published.put?.ok) {
      auditLog(
        published.put.publicUrl
          ? `HTML published: ${published.put.publicUrl}`
          : 'HTML uploaded via presigned PUT'
      );
    }
  } catch (err) {
    auditLog(`HTML publish failed: ${err.message}`);
  }

  if (jobFailed) {
    process.exit(1);
  }
}

main().catch((err) => {
  auditLog(`Fatal: ${err.message || err}`);
  process.exit(1);
});
