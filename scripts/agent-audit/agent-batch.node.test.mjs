import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toolCallsToAgentJson } from './llm-client.mjs';
import { createToolHost } from './tools.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('agent batch tooling', () => {
  it('maps multiple native tool_calls to batch JSON', () => {
    const json = toolCallsToAgentJson({
      tool_calls: [
        { function: { name: 'grep', arguments: '{"pattern":"foo"}' } },
        { function: { name: 'file_info', arguments: '{"filePath":"package.json"}' } }
      ]
    });
    const parsed = JSON.parse(json);
    assert.equal(parsed.type, 'batch');
    assert.equal(parsed.tools.length, 2);
  });

  it('batch dispatch returns partial results on failure', async () => {
    const host = createToolHost(REPO_ROOT, {});
    const settled = await Promise.allSettled([
      Promise.resolve(host.dispatch('file_info', { filePath: 'package.json' }, {})),
      Promise.resolve(host.dispatch('read_file', { filePath: 'missing-file-xyz' }, {}))
    ]);
    const results = settled.map((o, i) =>
      o.status === 'fulfilled' ? { ok: !o.value.error, result: o.value } : { ok: false, error: String(o.reason) }
    );
    assert.equal(results[0].ok, true);
    assert.equal(results[1].ok, false);
  });
});
