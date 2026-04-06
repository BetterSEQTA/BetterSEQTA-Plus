/** Tracks which author-declared CSS variables mirror the effective accent; not persisted in settings storage. */

const VALID_CUSTOM_PROP = /^--[a-zA-Z0-9_-]{1,120}$/;

let boundNames: string[] = [];

export function normalizeAdaptiveCssVariableNames(
  names: string[] | undefined,
): string[] {
  if (!names?.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of names) {
    const s = raw.trim();
    if (!VALID_CUSTOM_PROP.test(s) || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function setCustomThemeAdaptiveCssVariables(
  names: string[] | undefined,
): void {
  for (const n of boundNames) {
    document.documentElement.style.removeProperty(n);
  }
  boundNames = normalizeAdaptiveCssVariableNames(names);
}

export function getCustomThemeAdaptiveCssVariables(): string[] {
  return boundNames;
}

export function clearCustomThemeAdaptiveCssVariables(): void {
  for (const n of boundNames) {
    document.documentElement.style.removeProperty(n);
  }
  boundNames = [];
}
