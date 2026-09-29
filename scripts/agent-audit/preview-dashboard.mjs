#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import {
  computeDashboardStats,
  parseTranscriptJsonl,
  buildTimelineEvents,
  computeAgentMetrics
} from './lib/audit-cjs.mjs';
import { reportToHtml } from './report-html.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  let mode = 'security';
  let openBrowser = false;
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--mode' && argv[i + 1]) {
      mode = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--open') {
      openBrowser = true;
    }
  }
  if (mode !== 'security' && mode !== 'soc2') throw new Error(`Invalid --mode ${mode}`);
  return { mode, openBrowser };
}

function outputBasename(mode) {
  return mode === 'soc2' ? 'soc2-audit-report.preview.html' : 'agent-audit-report.preview.html';
}

function fixtureReport(mode) {
  const file =
    mode === 'soc2'
      ? path.join(__dirname, 'fixtures', 'sample-soc2-report.json')
      : path.join(__dirname, 'fixtures', 'sample-security-report.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main() {
  const { mode, openBrowser } = parseArgs(process.argv);
  const outDir = process.env.AUDIT_OUTPUT_DIR || REPO_ROOT;
  const report = fixtureReport(mode);
  const transcriptPath = path.join(__dirname, 'fixtures', 'sample-transcript.jsonl');
  const transcript = parseTranscriptJsonl(fs.readFileSync(transcriptPath, 'utf8'));
  const stats = computeDashboardStats(mode, report);
  const timelineEvents = buildTimelineEvents(transcript);
  const metrics = computeAgentMetrics(transcript, { turnsUsed: 4 });
  const html = reportToHtml(mode, report, { stats, timelineEvents, metrics });
  const outPath = path.join(outDir, outputBasename(mode));
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`Wrote ${outPath}`);
  if (openBrowser) {
    const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(cmd, [outPath], { shell: true, detached: true, stdio: 'ignore' }).unref();
  }
}

main();
