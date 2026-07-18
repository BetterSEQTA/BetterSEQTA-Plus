import { mount, unmount } from "svelte";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { extractSolidColor } from "@/seqta/ui/colors/parseCssColor";
import { ensureFontLoaded } from "@/seqta/ui/fonts/Manager";
import { getFontPreset } from "@/seqta/ui/fonts/presets";
import type { GoogleCalendarSyncProgress } from "@/seqta/utils/googleCalendar/types";
import CalendarSyncControl from "./CalendarSyncControl.svelte";
import { registerCalendarContentHandlers } from "@/seqta/utils/googleCalendar/calendarSyncListener";
import hostStyles from "./calendarSyncHost.css?inline";

export type CalendarProvider = "google" | "outlook";

export function providerLabel(provider: CalendarProvider): string {
  return provider === "google" ? "Google" : "Outlook";
}

export function formatLastSync(ts?: number): string | null {
  if (!ts) return null;
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Synced just now";
  if (diff < 3_600_000) return `Synced ${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `Synced ${Math.floor(diff / 3_600_000)}h ago`;
  return `Synced ${new Date(ts).toLocaleDateString()}`;
}

export function syncProgressPercent(progress: GoogleCalendarSyncProgress | null): number {
  if (!progress || progress.phase === "done") return 0;
  if (progress.total > 0) {
    return Math.min(100, Math.round((progress.current / progress.total) * 100));
  }
  return progress.phase === "preparing" ? 8 : 0;
}

const CONTROLS_CLASS = "timetable-calendar-controls";
const HOST_STYLE_ID = "bsplus-calendar-sync-host-styles";

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

let currentApp: ReturnType<typeof mount> | null = null;

export function portalToBody(node: HTMLElement) {
  document.body.appendChild(node);
  return {
    destroy() {
      node.remove();
    },
  };
}

export function isCalendarSyncModalTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(".bsplus-cal-modal-backdrop"));
}

/** Sync extension theme (including dark mode) onto a calendar UI host or portaled menu. */
export function syncCalendarSyncTheme(target: HTMLElement): void {
  const computed = getComputedStyle(document.documentElement);
  const dark = !!settingsState.DarkMode || document.documentElement.classList.contains("dark");
  const fontPreset = getFontPreset(settingsState.selectedFont);

  ensureFontLoaded(fontPreset);
  target.style.setProperty("--bsplus-cal-font-family", fontPreset.stack);

  for (const name of THEME_CSS_VARS) {
    const value =
      document.documentElement.style.getPropertyValue(name).trim() ||
      computed.getPropertyValue(name).trim();
    if (value) target.style.setProperty(name, value);
  }

  let accent = "#3b82f6";
  for (const name of ACCENT_CSS_VARS) {
    const solid = extractSolidColor(computed.getPropertyValue(name));
    if (solid) {
      accent = solid;
      break;
    }
  }
  if (accent === "#3b82f6") {
    const fromSettings = settingsState.selectedColor?.trim();
    if (fromSettings) {
      const solid = extractSolidColor(fromSettings);
      if (solid) accent = solid;
    }
  }
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

function ensureHostStyles() {
  if (document.getElementById(HOST_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HOST_STYLE_ID;
  style.textContent = hostStyles;
  document.head.appendChild(style);
}

function teardown() {
  if (currentApp) {
    unmount(currentApp);
    currentApp = null;
  }
  document.querySelector(`.${CONTROLS_CLASS}`)?.remove();
  document.getElementById(HOST_STYLE_ID)?.remove();
}

export async function mountGoogleCalendarButton(): Promise<void> {
  if (document.querySelector(`.${CONTROLS_CLASS}`)) return;

  const toolbar = document.getElementById("toolbar");
  if (!toolbar) return;

  ensureHostStyles();
  registerCalendarContentHandlers();

  const controls = document.createElement("div");
  controls.className = `${CONTROLS_CLASS} bsplus-timetable-control`;
  toolbar.appendChild(controls);

  const mountRoot = document.createElement("div");
  mountRoot.className = "bsplus-calendar-sync-mount";
  syncCalendarSyncTheme(mountRoot);
  controls.appendChild(mountRoot);

  currentApp = mount(CalendarSyncControl, { target: mountRoot });
}

export function unmountGoogleCalendarButton(): void {
  teardown();
}
