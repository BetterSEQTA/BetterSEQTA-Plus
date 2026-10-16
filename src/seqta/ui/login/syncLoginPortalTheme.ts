import { syncPageThemeToElement } from "@/interface/utils/syncPageTheme";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";

const THEME_SETTING_KEYS = [
  "selectedColor",
  "DarkMode",
  "selectedTheme",
  "adaptiveThemeColour",
  "adaptiveThemeGradient",
  "selectedFont",
] as const;

type ThemeSettingKey = (typeof THEME_SETTING_KEYS)[number];

let activeHost: HTMLElement | null = null;
let themeObserver: MutationObserver | null = null;
let themeListeners: Array<{ key: ThemeSettingKey; listener: () => void }> = [];

/** Copy the active SEQTA/BetterSEQTA theme onto the login portal shadow host. */
export function syncLoginPortalTheme(target: HTMLElement): void {
  syncPageThemeToElement(target);

  const computed = getComputedStyle(document.documentElement);
  for (const name of ["--betterseqta-font-family", "--better-alert-highlight"]) {
    const value = computed.getPropertyValue(name).trim();
    if (value) target.style.setProperty(name, value);
  }
}

function clearThemeListeners() {
  for (const { key, listener } of themeListeners) {
    settingsState.unregister(key, listener);
  }
  themeListeners = [];
}

/** Keep the login portal in sync when theme settings or page tokens change. */
export function watchLoginPortalTheme(target: HTMLElement): void {
  unwatchLoginPortalTheme();
  activeHost = target;
  syncLoginPortalTheme(target);

  const listener = () => {
    if (activeHost) syncLoginPortalTheme(activeHost);
  };

  for (const key of THEME_SETTING_KEYS) {
    settingsState.register(key, listener);
    themeListeners.push({ key, listener });
  }

  themeObserver = new MutationObserver(listener);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style", "class", "data-city-state"],
  });
}

export function unwatchLoginPortalTheme(): void {
  clearThemeListeners();
  themeObserver?.disconnect();
  themeObserver = null;
  activeHost = null;
}
