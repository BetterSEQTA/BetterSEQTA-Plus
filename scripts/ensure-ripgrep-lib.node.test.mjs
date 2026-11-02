import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRipgrepInstallTarget } from './ensure-ripgrep-lib.mjs';

describe('getRipgrepInstallTarget', () => {
  it('uses devDependency semver range from package.json', () => {
    assert.equal(
      getRipgrepInstallTarget({ '@vscode/ripgrep': '^1.15.9' }),
      '@vscode/ripgrep@^1.15.9'
    );
  });

  it('falls back when @vscode/ripgrep is not listed', () => {
    assert.equal(getRipgrepInstallTarget({}), '@vscode/ripgrep');
    assert.equal(getRipgrepInstallTarget(undefined), '@vscode/ripgrep');
  });
});
