import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { extractSolidColor } from "@/seqta/ui/colors/parseCssColor";

export const CALENDAR_THEME_CSS_VARS = [
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

export function isCalendarDarkMode(): boolean {
  return !!settingsState.DarkMode || document.documentElement.classList.contains("dark");
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
  return "#3b82f6";
}

/** Sync extension theme (including dark mode) onto a calendar UI host or portaled menu. */
export function syncCalendarSyncTheme(target: HTMLElement): void {
  const computed = getComputedStyle(document.documentElement);
  const dark = isCalendarDarkMode();

  for (const name of CALENDAR_THEME_CSS_VARS) {
    const value =
      document.documentElement.style.getPropertyValue(name).trim() ||
      computed.getPropertyValue(name).trim();
    if (value) target.style.setProperty(name, value);
  }

  const accent = resolvePageAccentColor();
  target.style.setProperty("--bsplus-cal-accent", accent);
  target.style.setProperty("--better-main", accent);
  target.classList.toggle("dark", dark);

  const textPrimary =
    computed.getPropertyValue("--text-primary").trim() ||
    computed.getPropertyValue("--text-color").trim();
  const bgPrimary =
    computed.getPropertyValue("--background-primary").trim() ||
    computed.getPropertyValue("--background-secondary").trim() ||
    computed.getPropertyValue("--theme-offset-bg").trim();

  target.style.setProperty(
    "--bsplus-cal-text",
    textPrimary || (dark ? "#f4f4f5" : "#18181b"),
  );
  target.style.setProperty(
    "--bsplus-cal-surface",
    bgPrimary || (dark ? "#27272a" : "#ffffff"),
  );
  target.style.setProperty(
    "--bsplus-cal-surface-muted",
    dark ? "#3f3f46" : "color-mix(in srgb, var(--bsplus-cal-text) 5%, var(--bsplus-cal-surface))",
  );
  target.style.setProperty(
    "--bsplus-cal-border",
    dark ? "color-mix(in srgb, #ffffff 14%, transparent)" : "color-mix(in srgb, var(--bsplus-cal-text) 12%, transparent)",
  );
}
