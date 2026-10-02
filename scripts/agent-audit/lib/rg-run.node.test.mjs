import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { runRipgrep, assertRipgrepReady, resolveGrepSanityProbe } from './rg-run.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

describe('rg-run', () => {
  it('resolveGrepSanityProbe picks extension or server probe', () => {
    const probe = resolveGrepSanityProbe(REPO_ROOT);
    assert.ok(probe);
    assert.ok(probe.pattern.length > 2);
  });

  it('runRipgrep finds requireHostType or chrome.runtime in this repo', () => {
    const probe = resolveGrepSanityProbe(REPO_ROOT);
    const result = runRipgrep({
      repoRoot: REPO_ROOT,
      pattern: probe.pattern,
      glob: probe.glob || '',
      maxMatches: 5
    });
    assert.equal(result.error, undefined);
    assert.ok(result.matchCount >= (probe.minMatches || 1));
  });

  it('runRipgrep pathPrefix scopes search', () => {
    const probe = resolveGrepSanityProbe(REPO_ROOT);
    const result = runRipgrep({
      repoRoot: REPO_ROOT,
      pattern: probe.pattern,
      pathPrefix: probe.glob?.includes('/') ? probe.glob.split('/')[0] : 'server',
      maxMatches: 5
    });
    assert.equal(result.error, undefined);
    assert.ok(result.matchCount >= 1);
  });

  it('assertRipgrepReady passes when @vscode/ripgrep is installed', () => {
    const pkgRg = path.join(REPO_ROOT, 'node_modules', '@vscode', 'ripgrep', 'package.json');
    if (!fs.existsSync(pkgRg)) {
      return;
    }
    assert.doesNotThrow(() => assertRipgrepReady(REPO_ROOT));
  });
});
