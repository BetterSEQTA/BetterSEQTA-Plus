import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { writeScratch, readScratch, deleteScratch, validateScratchName } from './scratch-pad.mjs';

describe('scratch-pad', () => {
  it('rejects invalid names', () => {
    assert.equal(validateScratchName('../x').error, 'invalid_name');
  });

  it('write and read round trip', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-scratch-'));
    const w = writeScratch(dir, { name: 'checklist', content: 'host: checked' });
    assert.equal(w.ok, true);
    const r = readScratch(dir, { name: 'checklist' });
    assert.match(r.content, /host/);
    deleteScratch(dir, { name: 'checklist' });
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
