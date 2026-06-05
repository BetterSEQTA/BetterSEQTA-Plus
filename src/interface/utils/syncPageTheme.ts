import { settingsState } from "@/seqta/utils/listeners/SettingsState";

const THEME_CSS_VARS = [
  "--better-main",
  "--better-pale",
  "--better-light",
  "--text-color",
  "--background-primary",
  "--background-secondary",
  "--text-primary",
  "--theme-offset-bg",
  "--better-sub",
] as const;

const ACCENT_CSS_VARS = [
  "--better-main",
  "--accent-color-value",
  "--accentColor",
  "--colour-betterseqta-blue",
] as const;

function extractSolidColor(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "initial") return null;
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("rgb") ||
    trimmed.startsWith("hsl")
  ) {
    return trimmed;
  }
  if (trimmed.includes("gradient")) {
    const match = trimmed.match(
      /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgba?\([^)]+\)/i,
    );
    return match?.[0] ?? null;
  }
  return null;
}

function resolvePageAccentColor(): string {
  const computed = getComputedStyle(document.documentElement);
  for (const name of ACCENT_CSS_VARS) {
    const solid = extractSolidColor(computed.getPropertyValue(name));
    if (solid) return solid;
  }
  const fromSettings = settingsState.selectedColor?.trim();
  if (fromSettings) {
    const solid = extractSolidColor(fromSettings);
    if (solid) return solid;
  }
  return "#007bff";
}

/** Copy SEQTA page theme tokens onto a portaled UI root (matches analytics sync). */
export function syncPageThemeToElement(target: HTMLElement): void {
  const computed = getComputedStyle(document.documentElement);

  for (const name of THEME_CSS_VARS) {
    const value = computed.getPropertyValue(name).trim();
    if (value) {
      target.style.setProperty(name, value);
    }
  }

  const accent = resolvePageAccentColor();
  target.style.setProperty("--bsplus-analytics-accent", accent);
  target.style.setProperty("--better-main", accent);

  target.classList.toggle(
    "dark",
    document.documentElement.classList.contains("dark"),
  );
}
