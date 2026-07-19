import renderSvelte from "@/interface/main";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import AssessmentsOverview from "./AssessmentsOverview.svelte";
import SkeletonLoader from "./SkeletonLoader.svelte";
import ErrorState from "./ErrorState.svelte";
import { unmount } from "svelte";

let currentApp: any = null;
let themeObserver: MutationObserver | null = null;
type ThemeSettingKey =
  | "selectedColor"
  | "DarkMode"
  | "adaptiveThemeColour"
  | "adaptiveThemeGradient"
  | "selectedTheme";

let themeListeners: Array<{ key: ThemeSettingKey; listener: () => void }> = [];

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

function syncOverviewTheme(target: HTMLElement) {
  const computed = getComputedStyle(document.documentElement);
  for (const name of THEME_CSS_VARS) {
    const value = document.documentElement.style.getPropertyValue(name).trim()
      || computed.getPropertyValue(name).trim();
    if (value) target.style.setProperty(name, value);
  }

  const accent = resolvePageAccentColor();
  target.style.setProperty("--bsplus-overview-accent", accent);
  target.style.setProperty("--better-main", accent);
  target.classList.toggle(
    "dark",
    document.documentElement.classList.contains("dark"),
  );
}

function watchOverviewTheme(root: HTMLElement) {
  for (const { key, listener } of themeListeners) {
    settingsState.unregister(key, listener);
  }
  themeListeners = [];

  const listener = () => syncOverviewTheme(root);
  for (const key of [
    "selectedColor",
    "DarkMode",
    "adaptiveThemeColour",
    "adaptiveThemeGradient",
    "selectedTheme",
  ] satisfies ThemeSettingKey[]) {
    settingsState.register(key, listener);
    themeListeners.push({ key, listener });
  }

  themeObserver?.disconnect();
  themeObserver = new MutationObserver(() => syncOverviewTheme(root));
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });
}

function prepareContainer(container: HTMLElement) {
  container.innerHTML = "";
  container.className = "bsplus-overview-host";
  container.classList.add("bsplus-overview-root");
  syncOverviewTheme(container);
  watchOverviewTheme(container);
}

export function renderGrid(container: HTMLElement, data: any) {
  if (currentApp) unmount(currentApp);
  prepareContainer(container);
  currentApp = renderSvelte(AssessmentsOverview, container, { data });
}

export function renderSkeletonLoader(container: HTMLElement) {
  if (currentApp) unmount(currentApp);
  prepareContainer(container);
  currentApp = renderSvelte(SkeletonLoader, container);
}

export function renderLoadingState(container: HTMLElement) {
  renderSkeletonLoader(container);
}

export function renderErrorState(container: HTMLElement, error: string) {
  if (currentApp) unmount(currentApp);
  prepareContainer(container);
  currentApp = renderSvelte(ErrorState, container, { error });
}

export function teardownOverviewUi() {
  for (const { key, listener } of themeListeners) {
    settingsState.unregister(key, listener);
  }
  themeListeners = [];
  themeObserver?.disconnect();
  themeObserver = null;
  if (currentApp) {
    unmount(currentApp);
    currentApp = null;
  }
}
