/** Tracks which author-declared CSS variables mirror the effective accent; not persisted in settings storage. */

const VALID_CUSTOM_PROP = /^--[a-zA-Z0-9_-]{1,120}$/;
const VALID_CHANNEL = /^(r|g|b)$/;

export type AdaptiveChannel = "r" | "g" | "b";

export type AdaptiveCssVariableBinding = {
  cssVarName: string;
  channel?: AdaptiveChannel;
};

let boundBindings: AdaptiveCssVariableBinding[] = [];

function parseAdaptiveBinding(
  rawBinding: string,
): AdaptiveCssVariableBinding | null {
  const trimmed = rawBinding.trim();
  if (!trimmed) return null;

  const [rawName, rawChannel] = trimmed.split(":", 2);
  const cssVarName = rawName?.trim() ?? "";
  if (!VALID_CUSTOM_PROP.test(cssVarName)) return null;

  if (!rawChannel) return { cssVarName };

  const channel = rawChannel.trim().toLowerCase();
  if (!VALID_CHANNEL.test(channel)) return null;

  return { cssVarName, channel: channel as AdaptiveChannel };
}

export function normalizeAdaptiveCssVariableBindings(
  names: string[] | undefined,
): AdaptiveCssVariableBinding[] {
  if (!names?.length) return [];
  const out: AdaptiveCssVariableBinding[] = [];
  const seen = new Set<string>();

  for (const raw of names) {
    const parsed = parseAdaptiveBinding(raw);
    if (!parsed) continue;
    const key = `${parsed.cssVarName}:${parsed.channel ?? "full"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }
  return out;
}

export function setCustomThemeAdaptiveCssVariables(
  names: string[] | undefined,
): void {
  for (const binding of boundBindings) {
    document.documentElement.style.removeProperty(binding.cssVarName);
  }
  boundBindings = normalizeAdaptiveCssVariableBindings(names);
}

export function getCustomThemeAdaptiveCssVariableBindings(): AdaptiveCssVariableBinding[] {
  return boundBindings;
}

// Backward-compatible helper for existing callsites.
export function getCustomThemeAdaptiveCssVariables(): string[] {
  return boundBindings.map((b) => b.cssVarName);
}

export function clearCustomThemeAdaptiveCssVariables(): void {
  for (const binding of boundBindings) {
    document.documentElement.style.removeProperty(binding.cssVarName);
  }
  boundBindings = [];
}
