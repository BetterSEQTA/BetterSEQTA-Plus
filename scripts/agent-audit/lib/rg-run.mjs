import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

let cachedRgBinary = null;

function cacheRgPath(candidate) {
  if (candidate && fs.existsSync(candidate)) {
    cachedRgBinary = candidate;
    return candidate;
  }
  return null;
}

/**
 * Resolve ripgrep binary: AGENT_AUDIT_RG_PATH, then @vscode/ripgrep, then PATH `rg`.
 */
export function resolveRgBinary(repoRoot) {
  const override = String(process.env.AGENT_AUDIT_RG_PATH || '').trim();
  if (override) return override;
  if (cachedRgBinary) return cachedRgBinary;

  try {
    const req = createRequire(path.join(repoRoot, 'package.json'));
    const fromPkg = req('@vscode/ripgrep')?.rgPath;
    const hit = cacheRgPath(fromPkg);
    if (hit) return hit;
  } catch {
    /* @vscode/ripgrep not installed */
  }

  const pkgRoot = path.join(repoRoot, 'node_modules', '@vscode', 'ripgrep');
  const candidates =
    process.platform === 'win32'
      ? [path.join(pkgRoot, 'bin', 'rg.exe'), path.join(pkgRoot, 'bin', 'rg')]
      : [path.join(pkgRoot, 'bin', 'rg'), path.join(pkgRoot, 'bin', 'rg.exe')];

  for (const candidate of candidates) {
    const hit = cacheRgPath(candidate);
    if (hit) return hit;
  }

  cachedRgBinary = 'rg';
  return 'rg';
}

export function resolveGrepSanityProbe(repoRoot) {
  const pattern = String(process.env.AGENT_AUDIT_SANITY_GREP_PATTERN || '').trim();
  if (pattern) {
    return {
      pattern,
      glob: String(process.env.AGENT_AUDIT_SANITY_GREP_GLOB || '').trim(),
      minMatches: parseInt(process.env.AGENT_AUDIT_SANITY_GREP_MIN || '1', 10)
    };
  }
  if (fs.existsSync(path.join(repoRoot, 'server', 'index.js'))) {
    return { pattern: 'requireHostType', glob: 'server/index.js', minMatches: 1 };
  }
  if (fs.existsSync(path.join(repoRoot, 'src', 'background.ts'))) {
    return { pattern: 'chrome\\.runtime', glob: 'src/**/*.ts', minMatches: 1 };
  }
  return null;
}

/**
 * Run ripgrep from repo root. Returns { pattern, glob, matchCount, lines, error?, detail? }.
 */
export function runRipgrep({
  repoRoot,
  pattern,
  glob = '',
  maxMatches = 60,
  pathPrefix = '',
  contextLines = 0,
  filesOnly = false
}) {
  if (!pattern || pattern.length > 200) {
    return { pattern, glob, matchCount: 0, lines: [], error: 'invalid_pattern' };
  }

  const root = path.resolve(repoRoot);
  let searchRoot = root;
  if (pathPrefix) {
    const normalized = path.normalize(String(pathPrefix)).replace(/^(\.\.(\/|\\|$))+/, '');
    searchRoot = path.resolve(root, normalized);
    if (!searchRoot.startsWith(root + path.sep) && searchRoot !== root) {
      return { pattern, glob, matchCount: 0, lines: [], error: 'invalid_path_prefix' };
    }
    if (!fs.existsSync(searchRoot)) {
      return { pattern, glob, matchCount: 0, lines: [], error: 'path_prefix_not_found' };
    }
  }

  const rg = resolveRgBinary(root);
  const ctx = Math.min(3, Math.max(0, parseInt(contextLines, 10) || 0));
  const args = filesOnly ? ['-l'] : ['--max-count', String(maxMatches), '--no-heading', '-n'];
  if (ctx > 0 && !filesOnly) args.unshift('-C', String(ctx));
  if (glob) args.push('-g', glob);
  args.push(pattern, searchRoot);

  const result = spawnSync(rg, args, { encoding: 'utf8', maxBuffer: 512 * 1024 });

  if (result.error) {
    return {
      pattern,
      glob,
      matchCount: 0,
      lines: [],
      error: 'rg_spawn_failed',
      detail: result.error.message
    };
  }

  if (result.status === 2) {
    return {
      pattern,
      glob,
      matchCount: 0,
      lines: [],
      error: 'rg_pattern_error',
      detail: (result.stderr || '').trim().slice(0, 500)
    };
  }

  const out = (result.stdout || '').trim();
  const lines = out ? out.split('\n').slice(0, maxMatches) : [];
  return { pattern, glob, matchCount: lines.length, lines };
}

export function assertRipgrepReady(repoRoot) {
  const probe = resolveGrepSanityProbe(repoRoot);
  const ping = runRipgrep({
    repoRoot,
    pattern: '__agent_audit_rg_preflight__',
    maxMatches: 1
  });
  if (ping.error === 'rg_spawn_failed') {
    throw new Error(
      `ripgrep not available (${ping.detail}). Install devDependency @vscode/ripgrep or set AGENT_AUDIT_RG_PATH.`
    );
  }

  if (!probe) return { sanity: null, pingOk: true };

  const sanity = runRipgrep({
    repoRoot,
    pattern: probe.pattern,
    glob: probe.glob || '',
    maxMatches: Math.max(probe.minMatches || 1, 5)
  });
  if (sanity.error) {
    throw new Error(`ripgrep sanity search failed: ${sanity.error} ${sanity.detail || ''}`.trim());
  }
  const min = probe.minMatches || 1;
  if (sanity.matchCount < min) {
    throw new Error(
      `ripgrep sanity search returned ${sanity.matchCount} matches for /${probe.pattern}/ (expected at least ${min}).`
    );
  }
  return { sanity: probe, matchCount: sanity.matchCount, pingOk: true };
}
