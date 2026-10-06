import fs from 'fs';
import path from 'path';
import { runRipgrep } from './lib/rg-run.mjs';
import { readFileSlice, fileInfo } from './lib/read-file-slice.mjs';
import { writeScratch, readScratch, deleteScratch } from './lib/scratch-pad.mjs';

const DENY_DIRS = new Set(['.git', 'node_modules']);
const DENY_GLOBS = ['.env', '.env.local'];

export function createToolHost(repoRoot, { scratchDir = null, contextBundle = null } = {}) {
  const root = path.resolve(repoRoot);

  function isJailed(relPath) {
    const normalized = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const abs = path.resolve(root, normalized);
    if (!abs.startsWith(root + path.sep) && abs !== root) return null;
    const base = path.basename(abs);
    if (DENY_GLOBS.some((g) => base === g || base.startsWith('.env'))) return null;
    return abs;
  }

  function listFiles({ prefix = '', limit = 80 } = {}) {
    const start = isJailed(prefix || '.');
    if (!start || !fs.existsSync(start)) return { error: 'invalid path', entries: [] };
    const stat = fs.statSync(start);
    if (!stat.isDirectory()) return { error: 'not a directory', entries: [] };
    const entries = [];
    for (const name of fs.readdirSync(start)) {
      if (DENY_DIRS.has(name)) continue;
      if (name.startsWith('.env')) continue;
      const rel = path.relative(root, path.join(start, name));
      entries.push(rel.replace(/\\/g, '/'));
      if (entries.length >= limit) break;
    }
    return { path: path.relative(root, start).replace(/\\/g, '/') || '.', entries };
  }

  const defaultReadBytes = parseInt(process.env.AGENT_AUDIT_READ_MAX_BYTES || '20000', 10);
  const defaultGrepMatches = parseInt(process.env.AGENT_AUDIT_GREP_MAX_MATCHES || '60', 10);

  function readFile(args = {}) {
    const abs = isJailed(args.filePath || '');
    if (!abs) return { error: 'path not allowed' };
    if (!fs.existsSync(abs)) return { error: 'not found' };
    const stat = fs.statSync(abs);
    if (!stat.isFile()) return { error: 'not a file' };

    const slice = readFileSlice(abs, { ...args, maxBytes: args.maxBytes ?? defaultReadBytes });
    if (slice.error) return slice;

    return {
      path: path.relative(root, abs).replace(/\\/g, '/'),
      ...slice
    };
  }

  function getFileInfo({ filePath } = {}) {
    const abs = isJailed(filePath || '');
    if (!abs) return { error: 'path not allowed' };
    if (!fs.existsSync(abs)) return { error: 'not found' };
    const stat = fs.statSync(abs);
    if (!stat.isFile()) return { error: 'not a file' };
    return {
      path: path.relative(root, abs).replace(/\\/g, '/'),
      ...fileInfo(abs)
    };
  }

  function grep(args = {}) {
    const result = runRipgrep({
      repoRoot: root,
      pattern: args.pattern,
      glob: args.glob || '',
      maxMatches: args.maxMatches ?? defaultGrepMatches,
      pathPrefix: args.pathPrefix || '',
      contextLines: args.contextLines ?? 0,
      filesOnly: !!args.filesOnly
    });
    if (result.error) {
      return {
        pattern: result.pattern,
        glob: result.glob,
        matchCount: 0,
        lines: [],
        files: [],
        error: result.error,
        detail: result.detail || ''
      };
    }
    return {
      pattern: result.pattern,
      glob: result.glob,
      matchCount: result.matchCount,
      lines: result.lines,
      files: args.filesOnly ? result.lines : undefined
    };
  }

  function readContextSection({ key } = {}) {
    if (!contextBundle?.sections) return { error: 'no_sections', available: [] };
    const k = String(key || '').trim();
    if (!k) return { error: 'missing_key', available: Object.keys(contextBundle.sections) };
    if (!(k in contextBundle.sections)) {
      return { error: 'unknown_key', available: Object.keys(contextBundle.sections) };
    }
    return { key: k, section: contextBundle.sections[k] };
  }

  function dispatch(name, args, context) {
    switch (name) {
      case 'list_files':
        return listFiles(args);
      case 'read_file':
        return readFile(args);
      case 'file_info':
        return getFileInfo(args);
      case 'grep':
      case 'search_files':
        return grep(args);
      case 'read_context_bundle':
        if (contextBundle?.index) return { index: contextBundle.index, sectionKeys: Object.keys(contextBundle.sections || {}) };
        return { bundle: context };
      case 'read_context_section':
        return readContextSection(args);
      case 'write_scratch':
        if (!scratchDir) return { error: 'scratch_unavailable' };
        return writeScratch(scratchDir, args);
      case 'read_scratch':
        if (!scratchDir) return { error: 'scratch_unavailable' };
        return readScratch(scratchDir, args);
      case 'delete_scratch':
        if (!scratchDir) return { error: 'scratch_unavailable' };
        return deleteScratch(scratchDir, args);
      default:
        return { error: `unknown tool: ${name}` };
    }
  }

  return { listFiles, readFile, getFileInfo, grep, dispatch, root, scratchDir };
}

export const TOOL_DEFINITIONS = [
  {
    name: 'list_files',
    description: 'List files in a directory under the repo (max 80).',
    parameters: { prefix: 'relative directory path', limit: 'optional number' }
  },
  {
    name: 'file_info',
    description: 'File size and line count without reading content. Use before read_file line ranges.',
    parameters: { filePath: 'relative path' }
  },
  {
    name: 'read_file',
    description:
      'Read a text file (byte cap default 20k). Optional startLine/endLine (1-based) or lineOffset+lineCount for partial reads.',
    parameters: {
      filePath: 'relative path',
      maxBytes: 'optional',
      startLine: 'optional 1-based',
      endLine: 'optional 1-based',
      lineOffset: 'optional 0-based line index',
      lineCount: 'optional line count'
    }
  },
  {
    name: 'grep',
    description: 'Ripgrep search (capped matches). Optional pathPrefix, contextLines (0-3), filesOnly.',
    parameters: {
      pattern: 'regex',
      glob: 'optional glob',
      maxMatches: 'optional',
      pathPrefix: 'optional directory under repo',
      contextLines: 'optional 0-3',
      filesOnly: 'optional boolean'
    }
  },
  {
    name: 'search_files',
    description: 'Alias for grep (same args). Prefer filesOnly:true to list paths only.',
    parameters: { pattern: 'regex', pathPrefix: 'optional', glob: 'optional', filesOnly: 'optional' }
  },
  {
    name: 'read_context_bundle',
    description: 'Return the audit context index and list of section keys. Pull sections with read_context_section.',
    parameters: {}
  },
  {
    name: 'read_context_section',
    description: 'Load one precomputed context section by key (from read_context_bundle sectionKeys).',
    parameters: { key: 'section key string' }
  },
  {
    name: 'write_scratch',
    description: 'Write session scratch note (audit checklist, bookmarks). Name: alphanumeric, 1-48 chars.',
    parameters: { name: 'note id', content: 'markdown text', append: 'optional boolean' }
  },
  {
    name: 'read_scratch',
    description: 'Read one scratch note by name, or list all notes if name omitted.',
    parameters: { name: 'optional note id' }
  },
  {
    name: 'delete_scratch',
    description: 'Delete a scratch note by name.',
    parameters: { name: 'note id' }
  }
];

export function toolResultMaxChars(toolName) {
  const defaults = {
    grep: 8000,
    search_files: 8000,
    read_file: 12000,
    file_info: 4000,
    read_context_section: 6000,
    read_context_bundle: 6000,
    write_scratch: 2000,
    read_scratch: 8000,
    default: 14000
  };
  const envKey = `AGENT_AUDIT_TOOL_RESULT_MAX_${String(toolName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')}`;
  if (process.env[envKey]) return parseInt(process.env[envKey], 10);
  return defaults[toolName] ?? defaults.default;
}
