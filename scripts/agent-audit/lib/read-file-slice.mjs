import fs from 'fs';

/**
 * Count lines in a file (for file_info and range validation).
 */
export function countFileLines(absPath) {
  const buf = fs.readFileSync(absPath);
  if (buf.length === 0) return 0;
  const parts = buf.toString('utf8').split(/\n/);
  if (parts.length && parts[parts.length - 1] === '') parts.pop();
  return parts.length;
}

function resolveLineRange(args, totalLines) {
  const hasStart = args.startLine != null && args.startLine !== '';
  const hasEnd = args.endLine != null && args.endLine !== '';
  const hasOffset = args.lineOffset != null && args.lineOffset !== '';
  const hasCount = args.lineCount != null && args.lineCount !== '';

  if (hasStart || hasEnd) {
    let start = hasStart ? parseInt(args.startLine, 10) : 1;
    let end = hasEnd ? parseInt(args.endLine, 10) : totalLines;
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return { error: 'invalid_line_range' };
    }
    start = Math.max(1, start);
    end = Math.min(totalLines, Math.max(start, end));
    return { startLine: start, endLine: end, truncatedByLines: end < (hasEnd ? parseInt(args.endLine, 10) : end) };
  }

  if (hasOffset || hasCount) {
    const offset = hasOffset ? parseInt(args.lineOffset, 10) : 0;
    const count = hasCount ? parseInt(args.lineCount, 10) : Math.min(200, totalLines);
    if (!Number.isFinite(offset) || !Number.isFinite(count) || offset < 0 || count < 1) {
      return { error: 'invalid_line_range' };
    }
    const start = Math.min(totalLines, offset + 1);
    const end = Math.min(totalLines, start + count - 1);
    return {
      startLine: start,
      endLine: end,
      truncatedByLines: end - start + 1 < count
    };
  }

  return null;
}

/**
 * Read a slice of a text file by line range and/or byte cap.
 */
export function readFileSlice(absPath, args = {}) {
  const maxBytes = parseInt(args.maxBytes || process.env.AGENT_AUDIT_READ_MAX_BYTES || '20000', 10);
  const stat = fs.statSync(absPath);
  const totalLines = countFileLines(absPath);
  const range = resolveLineRange(args, totalLines);

  if (range?.error) return { error: range.error };

  const buf = fs.readFileSync(absPath);
  const fullText = buf.toString('utf8');
  const allLines = fullText.split(/\n/);

  let startLine = 1;
  let endLine = totalLines;
  let truncatedByLines = false;

  if (range) {
    startLine = range.startLine;
    endLine = range.endLine;
    truncatedByLines = !!range.truncatedByLines;
  } else if (buf.length > maxBytes) {
    truncatedByLines = true;
    let bytes = 0;
    endLine = 0;
    for (let i = 0; i < allLines.length; i += 1) {
      const lineBytes = Buffer.byteLength(allLines[i], 'utf8') + (i < allLines.length - 1 ? 1 : 0);
      if (bytes + lineBytes > maxBytes) break;
      bytes += lineBytes;
      endLine = i + 1;
    }
    if (endLine < 1) endLine = 1;
  }

  const sliceLines = allLines.slice(startLine - 1, endLine);
  let content = sliceLines.join('\n');
  if (endLine < totalLines && sliceLines.length > 0) {
    content += '\n';
  }

  let truncatedByBytes = false;
  if (Buffer.byteLength(content, 'utf8') > maxBytes) {
    content = Buffer.from(content, 'utf8').slice(0, maxBytes).toString('utf8');
    truncatedByBytes = true;
  }

  return {
    startLine,
    endLine,
    totalLines,
    truncated: truncatedByBytes || truncatedByLines || endLine < totalLines,
    truncatedByBytes,
    truncatedByLines: truncatedByLines || endLine < totalLines,
    content
  };
}

export function fileInfo(absPath) {
  const stat = fs.statSync(absPath);
  const totalLines = countFileLines(absPath);
  return {
    sizeBytes: stat.size,
    lineCount: totalLines,
    isText: true,
    suggestedReadRanges:
      totalLines > 400
        ? [
            { startLine: 1, endLine: 120, note: 'file head (imports and early mounts)' },
            {
              startLine: Math.max(1, totalLines - 120),
              endLine: totalLines,
              note: 'file tail'
            }
          ]
        : [{ startLine: 1, endLine: totalLines, note: 'full file fits typical read cap' }]
  };
}
