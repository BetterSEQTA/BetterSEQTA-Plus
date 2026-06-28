/**
 * SEQTA themes and user gradients often use uppercase `RGBA()` / `RGB()`.
 * The `color` package only accepts lowercase function names.
 */
export function normalizeCssColorString(value: string): string {
  return value
    .trim()
    .replace(/\bRGBA?\(/gi, (match) => match.toLowerCase())
    .replace(/\bHSLA?\(/gi, (match) => match.toLowerCase());
}

/** Pick a single solid colour from a CSS value (hex, rgb(a), hsl(a), or gradient). */
export function extractSolidColor(value: string): string | null {
  const trimmed = normalizeCssColorString(value);
  if (!trimmed || trimmed === "initial") return null;
  if (
    trimmed.startsWith("#") ||
    /^rgba?\(/i.test(trimmed) ||
    /^hsla?\(/i.test(trimmed)
  ) {
    return trimmed;
  }
  if (trimmed.includes("gradient")) {
    const match = trimmed.match(
      /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgba?\([^)]+\)/gi,
    );
    return match?.[0] ? normalizeCssColorString(match[0]) : null;
  }
  return null;
}
