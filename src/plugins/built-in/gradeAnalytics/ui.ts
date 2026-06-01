import tailwindStyles from "@/interface/index.css?inline";
import pluginStyles from "./styles.css?inline";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { mount, unmount } from "svelte";
import GradeAnalyticsPage from "./GradeAnalyticsPage.svelte";

type ThemeSettingKey =
  | "selectedColor"
  | "DarkMode"
  | "adaptiveThemeColour"
  | "adaptiveThemeGradient"
  | "selectedTheme";

type ThemeListenerRegistration = {
  key: ThemeSettingKey;
  listener: () => void;
};

let currentApp: ReturnType<typeof mount> | null = null;
let shadowHost: HTMLElement | null = null;
let analyticsRoot: HTMLElement | null = null;
let darkModeObserver: MutationObserver | null = null;
let themeStyleObserver: MutationObserver | null = null;
let themeListeners: ThemeListenerRegistration[] = [];

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

/** Resolve a solid colour for charts (gradients → first stop). */
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

function syncThemeFromPage(target: HTMLElement) {
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

function syncThemeToAnalyticsUi() {
  if (shadowHost) syncThemeFromPage(shadowHost);
  if (analyticsRoot) syncThemeFromPage(analyticsRoot);
}

function clearThemeListeners() {
  for (const { key, listener } of themeListeners) {
    settingsState.unregister(key, listener);
  }
  themeListeners = [];
}

function watchThemeChanges() {
  clearThemeListeners();

  const keys: ThemeSettingKey[] = [
    "selectedColor",
    "DarkMode",
    "adaptiveThemeColour",
    "adaptiveThemeGradient",
    "selectedTheme",
  ];

  const listener = () => syncThemeToAnalyticsUi();
  for (const key of keys) {
    settingsState.register(key, listener);
    themeListeners.push({ key, listener });
  }

  themeStyleObserver?.disconnect();
  themeStyleObserver = new MutationObserver(() => syncThemeToAnalyticsUi());
  themeStyleObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });
}

function teardown() {
  clearThemeListeners();
  themeStyleObserver?.disconnect();
  themeStyleObserver = null;

  if (currentApp) {
    unmount(currentApp);
    currentApp = null;
  }
  darkModeObserver?.disconnect();
  darkModeObserver = null;
  shadowHost?.remove();
  shadowHost = null;
  analyticsRoot = null;
}

export function renderAnalyticsPage(container: HTMLElement) {
  teardown();

  container.innerHTML = "";
  container.className = "bsplus-analytics-container";

  shadowHost = document.createElement("div");
  shadowHost.className = "bsplus-analytics-host";
  container.appendChild(shadowHost);

  const shadow = shadowHost.attachShadow({ mode: "open" });

  const styleElement = document.createElement("style");
  styleElement.textContent = `${tailwindStyles}\n${pluginStyles}`;
  shadow.appendChild(styleElement);

  analyticsRoot = document.createElement("div");
  analyticsRoot.className = "bsplus-analytics-root";
  syncThemeToAnalyticsUi();
  shadow.appendChild(analyticsRoot);

  watchThemeChanges();

  darkModeObserver = new MutationObserver(() => syncThemeToAnalyticsUi());
  darkModeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  currentApp = mount(GradeAnalyticsPage, { target: analyticsRoot });
}

export function unmountAnalyticsPage() {
  teardown();
}
