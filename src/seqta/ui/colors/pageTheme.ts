import { settingsState } from "@/seqta/utils/listeners/settingsState";
import { extractSolidColor } from "./parseCssColor";

const THEME_CSS_VARS = [
  "--better-main",
  "--better-pale",
  "--better-light",
  "--better-sub",
  "--text-color",
  "--text-primary",
  "--background-primary",
  "--background-secondary",
  "--theme-primary",
  "--theme-secondary",
  "--theme-offset-bg",
] as const;

const ACCENT_CSS_VARS = [
  "--better-main",
  "--accent-color-value",
  "--accentColor",
  "--colour-betterseqta-blue",
] as const;

export function resolvePageAccentColor(fallback = "#007bff"): string {
  const computed = getComputedStyle(document.documentElement);
  for (const name of ACCENT_CSS_VARS) {
    const solid = extractSolidColor(computed.getPropertyValue(name));
    if (solid) return solid;
  }
  return extractSolidColor(settingsState.selectedColor ?? "") ?? fallback;
}

export function copyPageTheme(target: HTMLElement): void {
  const root = document.documentElement;
  const computed = getComputedStyle(root);
  for (const name of THEME_CSS_VARS) {
    const value =
      root.style.getPropertyValue(name).trim() || computed.getPropertyValue(name).trim();
    if (value) target.style.setProperty(name, value);
  }
  target.classList.toggle("dark", root.classList.contains("dark"));
}
