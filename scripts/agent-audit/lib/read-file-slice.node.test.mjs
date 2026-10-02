import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { readFileSlice, fileInfo } from './read-file-slice.mjs';

describe('read-file-slice', () => {
  it('reads line range', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-read-'));
    const file = path.join(dir, 'sample.txt');
    fs.writeFileSync(file, 'a\nb\nc\nd\n', 'utf8');
    const slice = readFileSlice(file, { startLine: 2, endLine: 3, maxBytes: 10000 });
    assert.equal(slice.startLine, 2);
    assert.equal(slice.endLine, 3);
    assert.equal(slice.totalLines, 4);
    assert.match(slice.content, /b/);
    assert.match(slice.content, /c/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('fileInfo reports line count', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-info-'));
    const file = path.join(dir, 'x.txt');
    fs.writeFileSync(file, 'one\ntwo\n', 'utf8');
    const info = fileInfo(file);
    assert.equal(info.lineCount, 2);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
