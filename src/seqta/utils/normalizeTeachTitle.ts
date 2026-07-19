/**
 * SEQTA Teach often titles pages as "… - SEQTA" (no "Teach"), which breaks
 * title-based detection and looks unfinished vs Learn/Engage.
 */
export function normalizeTeachDocumentTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return title;

  if (/seqta teach/i.test(trimmed)) {
    return trimmed;
  }

  // Don't rewrite Learn/Engage titles if somehow present
  if (/seqta learn|seqta engage/i.test(trimmed)) {
    return trimmed;
  }

  // Include hyphen, en/em dash, and SEQTA's horizontal bar (―)
  const sep = String.raw`[-–—―]`;

  if (new RegExp(String.raw`\s${sep}\sBetterSEQTA\+?\s*$`, "i").test(trimmed)) {
    return trimmed.replace(
      new RegExp(String.raw`\s${sep}\sBetterSEQTA\+?\s*$`, "i"),
      " ― SEQTA Teach",
    );
  }

  if (new RegExp(String.raw`\s${sep}\sSEQTA\s*$`, "i").test(trimmed)) {
    return trimmed.replace(
      new RegExp(String.raw`\s${sep}\sSEQTA\s*$`, "i"),
      " ― SEQTA Teach",
    );
  }

  return trimmed;
}

/** Apply title normalization to the live document when needed. */
export function syncTeachDocumentTitle(
  title: string = document.title,
): string {
  const next = normalizeTeachDocumentTitle(title);
  if (next && next !== document.title) {
    document.title = next;
  }
  return document.title;
}
