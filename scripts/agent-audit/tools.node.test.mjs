import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { createToolHost } from './tools.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('agent-audit tools', () => {
  it('read_context_bundle returns index when sections present', () => {
    const host = createToolHost(REPO_ROOT, {
      contextBundle: { index: { mode: 'security' }, sections: { a: 1 } }
    });
    const r = host.dispatch('read_context_bundle', {}, {});
    assert.ok(r.index);
    assert.deepEqual(r.sectionKeys, ['a']);
  });

  it('file_info on package.json', () => {
    const host = createToolHost(REPO_ROOT, {});
    const r = host.dispatch('file_info', { filePath: 'package.json' }, {});
    assert.ok(r.lineCount > 5);
  });
});
