import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';
import { runRipgrep } from './lib/rg-run.mjs';

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

function npmAuditSummary() {
  const result = spawnSync('npm', ['audit', '--json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024
  });
  try {
    const data = JSON.parse(result.stdout || '{}');
    const meta = data.metadata?.vulnerabilities || {};
    return {
      ok: result.status === 0,
      exitCode: result.status,
      vulnerabilities: meta,
      advisoriesSample: Object.keys(data.advisories || {}).slice(0, 15)
    };
  } catch {
    return { ok: false, parseError: true, stderr: (result.stderr || '').slice(0, 500) };
  }
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

function soc2PolicyBundle() {
  return {};
}

export async function buildContext(mode, meta = {}) {
  const shared = {
    mode,
    generatedAt: new Date().toISOString(),
    git: meta.git || {},
    npmAudit: npmAuditSummary(),
    securityGreps: securityGrepBundle(),
    migrationsRecent: [],
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
    shared.soc2 = {
      policies: soc2PolicyBundle(),
      accessFlowsHead: null,
      logger: null,
      dependabot: fs.existsSync(path.join(REPO_ROOT, '.github/dependabot.yml'))
        ? readExcerpt('.github/dependabot.yml', 2000)
        : { note: 'no dependabot.yml in repo' }
    };
  } else {
    shared.security = {
      smokeScript: readExcerpt('scripts/smoke-test.mjs', 3000),
      testCount: countUnitTests()
    };
  }

  return shared;
}

export function writeContextFile(context, outPath) {
  fs.writeFileSync(outPath, JSON.stringify(context, null, 2), 'utf8');
}
