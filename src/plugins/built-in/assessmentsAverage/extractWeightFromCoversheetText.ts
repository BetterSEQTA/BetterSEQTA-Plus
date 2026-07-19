/** Pull a numeric weighting from coversheet / report PDF text. */
export function extractWeightFromCoversheetText(text: string): string | null {
  const patterns = [
    /weightings?\s*:\s*(\d+(?:\.\d+)?)\s*%?/i,
    /weight\s*:\s*(\d+(?:\.\d+)?)\s*%?/i,
    /assessment\s+weight(?:ing)?\s*:\s*(\d+(?:\.\d+)?)\s*%?/i,
    /weight(?:ing)?\s+(?:of\s+)?(\d+(?:\.\d+)?)\s*%/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}
