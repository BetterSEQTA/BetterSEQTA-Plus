import fs from 'fs';
import os from 'os';
import path from 'path';

const NAME_RE = /^[a-zA-Z0-9_-]{1,48}$/;
const REVISIONS_BASENAME = '_revisions.jsonl';

function maxFileBytes() {
  return parseInt(process.env.AGENT_AUDIT_SCRATCH_MAX_BYTES || '32768', 10);
}

function maxFiles() {
  return parseInt(process.env.AGENT_AUDIT_SCRATCH_MAX_FILES || '20', 10);
}

export function validateScratchName(name) {
  const n = String(name || '').trim();
  if (!NAME_RE.test(n)) return { error: 'invalid_name', detail: 'Use 1-48 chars: letters, digits, underscore, hyphen.' };
  return { name: n };
}

function scratchPath(scratchDir, name) {
  const abs = path.resolve(scratchDir, `${name}.md`);
  if (!abs.startsWith(path.resolve(scratchDir) + path.sep)) {
    return { error: 'path_escape' };
  }
  return { path: abs };
}

function revisionsPath(scratchDir) {
  return path.join(scratchDir, REVISIONS_BASENAME);
}

function appendRevision(scratchDir, row) {
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  const line = `${JSON.stringify({ ts: new Date().toISOString(), ...row })}\n`;
  fs.appendFileSync(revisionsPath(scratchDir), line, 'utf8');
}

/** @returns {Array<Record<string, unknown>>} */
export function readRevisionJournal(scratchDir) {
  const p = revisionsPath(scratchDir);
  if (!fs.existsSync(p)) return [];
  const entries = [];
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      entries.push(JSON.parse(t));
    } catch {
      /* skip bad line */
    }
  }
  return entries;
}

export function writeScratch(scratchDir, { name, content, append = false }) {
  const v = validateScratchName(name);
  if (v.error) return v;
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const p = scratchPath(scratchDir, v.name);
  if (p.error) return p;

  const existing = fs.existsSync(p.path) ? fs.readFileSync(p.path, 'utf8') : '';
  const files = fs.readdirSync(scratchDir).filter((f) => f.endsWith('.md'));
  if (!existing && files.length >= maxFiles()) {
    return { error: 'max_files', detail: String(maxFiles()) };
  }

  const body = append && existing ? `${existing}\n${content}` : String(content ?? '');
  if (Buffer.byteLength(body, 'utf8') > maxFileBytes()) {
    return { error: 'max_bytes', detail: String(maxFileBytes()) };
  }

  fs.writeFileSync(p.path, body, 'utf8');
  const bytes = Buffer.byteLength(body, 'utf8');
  const action = append && existing ? 'append' : 'write';
  const revisionIndex = readRevisionJournal(scratchDir).length + 1;
  appendRevision(scratchDir, {
    name: v.name,
    action,
    append: !!(append && existing),
    content: body,
    bytes,
    revisionIndex
  });
  return { ok: true, name: v.name, bytes, revisionIndex };
}

export function readScratch(scratchDir, { name } = {}) {
  if (!fs.existsSync(scratchDir)) {
    return name ? { error: 'not_found' } : { files: [] };
  }
  if (name) {
    const v = validateScratchName(name);
    if (v.error) return v;
    const p = scratchPath(scratchDir, v.name);
    if (p.error) return p;
    if (!fs.existsSync(p.path)) return { error: 'not_found', name: v.name };
    const content = fs.readFileSync(p.path, 'utf8');
    return { name: v.name, content, bytes: Buffer.byteLength(content, 'utf8') };
  }
  const files = fs
    .readdirSync(scratchDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const abs = path.join(scratchDir, f);
      const stat = fs.statSync(abs);
      return { name: f.replace(/\.md$/, ''), bytes: stat.size };
    });
  return { files };
}

export function deleteScratch(scratchDir, { name }) {
  const v = validateScratchName(name);
  if (v.error) return v;
  const p = scratchPath(scratchDir, v.name);
  if (p.error) return p;
  if (!fs.existsSync(p.path)) return { error: 'not_found', name: v.name };
  const previousBytes = fs.statSync(p.path).size;
  fs.unlinkSync(p.path);
  const revisionIndex = readRevisionJournal(scratchDir).length + 1;
  appendRevision(scratchDir, {
    name: v.name,
    action: 'delete',
    append: false,
    content: '',
    previousBytes,
    bytes: 0,
    revisionIndex
  });
  return { ok: true, name: v.name, revisionIndex };
}

export function scratchSummary(scratchDir) {
  const r = readScratch(scratchDir, {});
  if (!r.files?.length) return '';
  return r.files.map((f) => `${f.name} (${f.bytes}B)`).join(', ');
}

function reportMaxTotalBytes() {
  return parseInt(process.env.AGENT_AUDIT_SCRATCH_REPORT_MAX_BYTES || '65536', 10);
}

function truncateUtf8ForReport(str, maxBytes) {
  const buf = Buffer.from(String(str ?? ''), 'utf8');
  if (buf.length <= maxBytes) return String(str ?? '');
  let end = maxBytes;
  while (end > 0) {
    const slice = buf.subarray(0, end).toString('utf8');
    if (!slice.endsWith('\uFFFD') || end === maxBytes) {
      return `${slice}\n… [truncated for report]`;
    }
    end -= 1;
  }
  return '… [truncated for report]';
}

/** Snapshot scratch notes for JSON/HTML report (read-only, size-capped). */
export function exportScratchForReport(scratchDir) {
  const r = readScratch(scratchDir, {});
  if (!r.files?.length) return { notes: [] };

  const maxTotal = reportMaxTotalBytes();
  const sorted = [...r.files].sort((a, b) => a.name.localeCompare(b.name));
  const notes = [];
  let total = 0;
  let truncated = false;

  for (const f of sorted) {
    if (total >= maxTotal) {
      truncated = true;
      break;
    }
    const one = readScratch(scratchDir, { name: f.name });
    if (one.error || one.content == null) continue;

    const remaining = maxTotal - total;
    let content = one.content;
    let noteTruncated = false;
    const bytes = Buffer.byteLength(content, 'utf8');
    if (bytes > remaining) {
      content = truncateUtf8ForReport(content, remaining);
      noteTruncated = true;
      truncated = true;
    }
    total += Buffer.byteLength(content, 'utf8');
    notes.push({
      name: f.name,
      content,
      ...(noteTruncated ? { truncated: true } : {})
    });
  }

  if (sorted.length > notes.length) truncated = true;
  return { notes, ...(truncated ? { truncated: true } : {}) };
}

/** Revision journal for JSON/HTML report (size-capped). */
export function exportScratchRevisionsForReport(scratchDir) {
  const journal = readRevisionJournal(scratchDir);
  if (!journal.length) return { revisions: [] };

  const maxTotal = reportMaxTotalBytes();
  const revisions = [];
  let total = 0;
  let truncated = false;

  for (const row of journal) {
    if (total >= maxTotal) {
      truncated = true;
      break;
    }
    const content = String(row.content ?? '');
    const remaining = maxTotal - total;
    let outContent = content;
    let rowTruncated = false;
    const contentBytes = Buffer.byteLength(content, 'utf8');
    if (contentBytes > remaining) {
      outContent = truncateUtf8ForReport(content, remaining);
      rowTruncated = true;
      truncated = true;
    }
    total += Buffer.byteLength(outContent, 'utf8');
    revisions.push({
      ts: row.ts,
      name: row.name,
      action: row.action,
      append: !!row.append,
      content: outContent,
      bytes: row.bytes,
      ...(row.revisionIndex != null ? { revisionIndex: row.revisionIndex } : {}),
      ...(row.previousBytes != null ? { previousBytes: row.previousBytes } : {}),
      ...(rowTruncated ? { truncated: true } : {})
    });
  }

  if (journal.length > revisions.length) truncated = true;
  return { revisions, ...(truncated ? { truncated: true } : {}) };
}

export function resolveScratchDir(repoRoot, runId) {
  const override = String(process.env.AGENT_AUDIT_SCRATCH_DIR || '').trim();
  if (override) return path.resolve(override);
  const inRepo = path.join(repoRoot, '.agent-audit', 'scratch', runId);
  if (process.env.AGENT_AUDIT_SCRATCH_IN_REPO === '1') return inRepo;
  return path.join(os.tmpdir(), 'agent-audit-scratch', runId);
}
