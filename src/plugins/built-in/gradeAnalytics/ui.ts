import tailwindStyles from "@/css/tailwind.css?inline";
import pluginStyles from "./styles.css?inline";
import { settingsState } from "@/seqta/utils/listeners/settingsState";
import { isSimpleAnalyticsUi } from "@/seqta/utils/performanceMode";
import { mount, unmount } from "svelte";
import GradeAnalyticsPage from "./GradeAnalyticsPage.svelte";
import { buildContrastAccentPalette } from "./utils/accentColor";
import { copyPageTheme, resolvePageAccentColor } from "@/seqta/ui/colors/pageTheme";
import { isAnalyticsRoute } from "./injectAnalyticsMenuItem";

type ThemeSettingKey =
  | "selectedColor"
  | "DarkMode"
  | "adaptiveThemeColour"
  | "adaptiveThemeGradient"
  | "selectedTheme"
  | "animations";

type ThemeListenerRegistration = {
  key: ThemeSettingKey;
  listener: () => void;
};

let currentApp: ReturnType<typeof mount> | null = null;
let shadowHost: HTMLElement | null = null;
let analyticsRoot: HTMLElement | null = null;
let themeStyleObserver: MutationObserver | null = null;
let themeListeners: ThemeListenerRegistration[] = [];

const ANALYTICS_PAGE_STYLE_ID = "bsplus-analytics-page-styles";

/** Light-DOM styles: stacking scope below ExtensionPopup, and #main sizing only while Analytics is shown. */
function ensureAnalyticsPageStyles() {
  if (document.getElementById(ANALYTICS_PAGE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = ANALYTICS_PAGE_STYLE_ID;
  style.textContent = `
    #main:has(> #analytics-view-container) {
      overflow: auto;
      width: 100%;
      max-width: none;
    }
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

const THEME_ACCENT_OVERRIDES: Record<string, string> = {
  "bb0aaf40-55ef-40f7-bc64-93b67ef96c01": "#4ade80",
};

function syncThemeFromPage(target: HTMLElement) {
  copyPageTheme(target);

  const accent =
    THEME_ACCENT_OVERRIDES[settingsState.selectedTheme ?? ""] ?? resolvePageAccentColor();
  const surface =
    target.style.getPropertyValue("--background-primary").trim() ||
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
}

function syncThemeToAnalyticsUi() {
  if (shadowHost) syncThemeFromPage(shadowHost);
  if (analyticsRoot) {
    syncThemeFromPage(analyticsRoot);
    analyticsRoot.classList.toggle("bsplus-analytics-motion", !!settingsState.animations);
    analyticsRoot.classList.toggle("bsplus-analytics-simple", isSimpleAnalyticsUi());
  }
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
    "animations",
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

function onRouteChange() {
  if (!isAnalyticsRoute()) teardown();
}

function teardown() {
  window.removeEventListener("hashchange", onRouteChange);
  clearThemeListeners();
  themeStyleObserver?.disconnect();
  themeStyleObserver = null;

  if (currentApp) {
    unmount(currentApp);
    currentApp = null;
  }
  shadowHost?.remove();
  shadowHost = null;
  analyticsRoot = null;
}

export function renderAnalyticsPage(container: HTMLElement) {
  teardown();

  ensureAnalyticsPageStyles();
  window.addEventListener("hashchange", onRouteChange);

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

  currentApp = mount(GradeAnalyticsPage, {
    target: analyticsRoot,
    props: { simpleMode: isSimpleAnalyticsUi() },
  });
}

export function unmountAnalyticsPage() {
  teardown();
}
