import tailwindStyles from "./tailwind.css?inline";
import pluginStyles from "./styles.css?inline";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { mount, unmount } from "svelte";
import GradeAnalyticsPage from "./GradeAnalyticsPage.svelte";
import { buildContrastAccentPalette } from "./utils/accentColor";

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

const ANALYTICS_STACKING_STYLE_ID = "bsplus-analytics-stacking-styles";

/** Light-DOM stacking scope so toolbar/dropdown z-index cannot paint over ExtensionPopup. */
function ensureAnalyticsStackingScope() {
  if (document.getElementById(ANALYTICS_STACKING_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = ANALYTICS_STACKING_STYLE_ID;
  style.textContent = `
    #analytics-view-container,
    .bsplus-analytics-container,
    .bsplus-analytics-host {
      position: relative;
      z-index: 0;
      isolation: isolate;
    }
  `;
  document.head.appendChild(style);
}

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

const THEME_ACCENT_OVERRIDES: Record<string, string> = {
  "bb0aaf40-55ef-40f7-bc64-93b67ef96c01": "#4ade80",
};

function resolvePageAccentColor(): string {
  const themeId = settingsState.selectedTheme;
  if (themeId && themeId in THEME_ACCENT_OVERRIDES) {
    return THEME_ACCENT_OVERRIDES[themeId];
  }
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
    let value = computed.getPropertyValue(name).trim();
    value = document.documentElement.style.getPropertyValue(name).trim();
    if (value) {
      target.style.setProperty(name, value);
    }
  }

  const accent = resolvePageAccentColor();
  const surface =
    target.style.getPropertyValue("--background-primary").trim() ||
    computed.getPropertyValue("--background-primary").trim() ||
    (target.classList.contains("dark") ? "#1e293b" : "#ffffff");
  const palette = buildContrastAccentPalette(accent, surface);

  target.style.setProperty("--bsplus-analytics-accent", palette.accent);
  target.style.setProperty("--bsplus-analytics-accent-subtle", palette.accentSubtle);
  target.style.setProperty("--item-colour", palette.accent);
  target.style.setProperty(
    "--bsplus-analytics-forecast",
    `color-mix(in srgb, ${palette.accent} 72%, ${target.classList.contains("dark") ? "#f8fafc" : "#64748b"})`,
  );
  target.style.setProperty("--better-main", palette.accent);
  target.style.setProperty("--bsplus-theme-btn-primary-bg", palette.accent);
  target.style.setProperty("--bsplus-theme-btn-primary-color", palette.onAccent);

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

  ensureAnalyticsStackingScope();

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
  analyticsRoot.className = "bsplus-analytics-mount";
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
