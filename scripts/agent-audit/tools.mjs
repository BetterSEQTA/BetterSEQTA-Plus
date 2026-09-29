import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const DENY_DIRS = new Set(['.git', 'node_modules']);
const DENY_GLOBS = ['.env', '.env.local'];

export function createToolHost(repoRoot) {
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

  function readFile({ filePath, maxBytes = defaultReadBytes } = {}) {
    const abs = isJailed(filePath || '');
    if (!abs) return { error: 'path not allowed' };
    if (!fs.existsSync(abs)) return { error: 'not found' };
    const stat = fs.statSync(abs);
    if (!stat.isFile()) return { error: 'not a file' };
    const buf = fs.readFileSync(abs);
    const text = buf.slice(0, maxBytes).toString('utf8');
    return {
      path: path.relative(root, abs).replace(/\\/g, '/'),
      truncated: buf.length > maxBytes,
      content: text
    };
  }

  function grep({ pattern, glob = '', maxMatches = defaultGrepMatches } = {}) {
    if (!pattern || pattern.length > 200) return { error: 'invalid pattern' };
    const args = ['--max-count', String(maxMatches), '--no-heading', '-n', pattern, root];
    if (glob) args.splice(0, 0, ...['-g', glob]);
    const result = spawnSync('rg', args, { encoding: 'utf8', maxBuffer: 512 * 1024 });
    const out = (result.stdout || '').trim();
    const lines = out ? out.split('\n').slice(0, maxMatches) : [];
    return { pattern, matchCount: lines.length, lines };
  }

  function dispatch(name, args, contextBundle) {
    switch (name) {
      case 'list_files':
        return listFiles(args);
      case 'read_file':
        return readFile(args);
      case 'grep':
        return grep(args);
      case 'read_context_bundle':
        return { bundle: contextBundle };
      default:
        return { error: `unknown tool: ${name}` };
    }
  }

  return { listFiles, readFile, grep, dispatch, root };
}

export const TOOL_DEFINITIONS = [
  {
    name: 'list_files',
    description: 'List files in a directory under the repo (max 80).',
    parameters: { prefix: 'relative directory path', limit: 'optional number' }
  },
  {
    name: 'read_file',
    description: 'Read a text file under the repo (default max 20k bytes, env AGENT_AUDIT_READ_MAX_BYTES).',
    parameters: { filePath: 'relative path', maxBytes: 'optional' }
  },
  {
    name: 'grep',
    description: 'Ripgrep search from repo root (capped matches).',
    parameters: { pattern: 'regex', glob: 'optional glob', maxMatches: 'optional' }
  },
  {
    name: 'read_context_bundle',
    description: 'Return the precomputed audit context JSON from CI collection phase.',
    parameters: {}
  }
];
