import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';
import { runRipgrep } from './lib/rg-run.mjs';
import { npmAuditSummary } from './lib/npm-audit-summary.mjs';
import { buildRepoIndex } from './repo-context-betterseqta.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function readExcerpt(relPath, maxBytes = 8000) {
  const abs = path.join(REPO_ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  const buf = fs.readFileSync(abs);
  return {
    path: relPath,
    truncated: buf.length > maxBytes,
    content: buf.slice(0, maxBytes).toString('utf8')
  };
}

function runRg(pattern, glob = '') {
  const result = runRipgrep({ repoRoot: REPO_ROOT, pattern, glob, maxMatches: 25 });
  if (result.error) return [];
  return result.lines;
}

function countUnitTests() {
  try {
    return globSync('src/**/*.test.ts', { cwd: REPO_ROOT }).length;
  } catch {
    return 0;
  }
}

function securityGrepBundle() {
  return {
    innerHTML: runRg('\\binnerHTML\\s*=', '*.{ts,js,svelte}'),
    stringToHTML: runRg('stringToHTML', 'src/**/*.ts'),
    evalUsage: runRg('\\beval\\(', '*.{ts,js}'),
    newFunction: runRg('new Function\\(', '*.{ts,js}'),
    chromeSendMessage: runRg('chrome\\.runtime\\.sendMessage', 'src/**/*.{ts,js}'),
    runtimeOnMessage: runRg('runtime\\.onMessage', 'src/**/*.{ts,js}'),
    postMessage: runRg('postMessage\\(', 'src/**/*.{ts,js}'),
    broadHostPermissions: runRg('\\*://\\*/\\*', 'src/manifests/**')
  };
}

function optionalGitDelta() {
  if (process.env.AGENT_AUDIT_GIT_DELTA !== '1') return null;
  const result = spawnSync('git', ['diff', '--name-only', 'HEAD~1', 'HEAD'], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  });
  if (result.status !== 0) return null;
  const changedFiles = (result.stdout || '')
    .trim()
    .split('\n')
    .filter(Boolean)
    .slice(0, 100);
  return { base: 'HEAD~1', head: 'HEAD', changedFiles };
}

function soc2PolicyBundle() {
  return {};
}

export async function buildContext(mode, meta = {}) {
  const repoIndex = buildRepoIndex(REPO_ROOT);
  const npmAudit = npmAuditSummary(REPO_ROOT);
  const gitDelta = optionalGitDelta();

  const index = {
    mode,
    generatedAt: new Date().toISOString(),
    git: meta.git || {},
    npmAuditSummary: {
      ok: npmAudit.ok,
      vulnerabilities: npmAudit.vulnerabilities,
      advisoriesSample: npmAudit.advisoriesSample
    },
    scratchHint: 'Use write_scratch for checklist and file:line bookmarks across long runs.',
    sectionKeys: [],
    ...repoIndex,
    gitDelta
  };

  const sections = {
    npmAuditFull: npmAudit,
    securityGreps: securityGrepBundle(),
    fileHints: {
      manifest: readExcerpt('src/manifests/manifest.json', 8000),
      background: readExcerpt('src/background.ts', 10000),
      viteConfig: readExcerpt('vite.config.ts', 6000),
      devApiBase: readExcerpt('src/seqta/utils/DevApiBase.ts', 5000),
      stringToHTML: readExcerpt('src/seqta/utils/stringToHTML.ts', 4000),
      envExample: readExcerpt('.env.example', 2000),
      workflows: {
        prCi: readExcerpt('.github/workflows/pr-ci.yml', 4000),
        release: readExcerpt('.github/workflows/release.yml', 3000),
        agentAudit: readExcerpt('.github/workflows/agent-audit.yml', 3000)
      }
    }
  };

  if (mode === 'soc2') {
    sections.soc2 = {
      policies: soc2PolicyBundle(),
      dependabot: fs.existsSync(path.join(REPO_ROOT, '.github/dependabot.yml'))
        ? readExcerpt('.github/dependabot.yml', 2000)
        : { note: 'no dependabot.yml in repo' }
    };
  } else {
    sections.security = {
      smokeScript: readExcerpt('scripts/smoke-test.mjs', 3000),
      testCount: countUnitTests()
    };
  }

  index.sectionKeys = Object.keys(sections);

  return {
    mode,
    generatedAt: index.generatedAt,
    git: index.git,
    index,
    sections,
    npmAudit,
    securityGreps: sections.securityGreps,
    migrationsRecent: [],
    fileHints: sections.fileHints
  };
}

export function writeContextFile(context, outPath) {
  fs.writeFileSync(outPath, JSON.stringify(context, null, 2), 'utf8');
}
