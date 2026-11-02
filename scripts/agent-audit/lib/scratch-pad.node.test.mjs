import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  writeScratch,
  readScratch,
  deleteScratch,
  validateScratchName,
  exportScratchForReport,
  exportScratchRevisionsForReport,
  readRevisionJournal
} from './scratch-pad.mjs';

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

  it('exportScratchForReport includes all notes sorted by name', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-scratch-'));
    writeScratch(dir, { name: 'b_note', content: 'second' });
    writeScratch(dir, { name: 'a_note', content: 'first' });
    const exp = exportScratchForReport(dir);
    assert.equal(exp.notes.length, 2);
    assert.equal(exp.notes[0].name, 'a_note');
    assert.equal(exp.notes[1].content, 'second');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('records write, append, and delete in revision journal', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-scratch-'));
    writeScratch(dir, { name: 'checklist', content: 'line one' });
    writeScratch(dir, { name: 'checklist', content: 'line two', append: true });
    deleteScratch(dir, { name: 'checklist' });
    const journal = readRevisionJournal(dir);
    assert.equal(journal.length, 3);
    assert.equal(journal[0].action, 'write');
    assert.match(journal[0].content, /line one/);
    assert.equal(journal[1].action, 'append');
    assert.match(journal[1].content, /line two/);
    assert.equal(journal[2].action, 'delete');
    assert.equal(journal[2].previousBytes > 0, true);
    const exp = exportScratchRevisionsForReport(dir);
    assert.equal(exp.revisions.length, 3);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
