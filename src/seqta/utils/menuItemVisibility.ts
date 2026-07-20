import { settingsState } from "./listeners/SettingsState";

const STYLE_ID = "bsplus-menuitem-visibility";

/** Apply hide rules from `menuitems` (re-runnable after edit / storage sync). */
export function applyMenuItemVisibility(): void {
  if (document.querySelector(".editmenuoption-container")) return;

  try {
    let css = "";
    for (const [menuItem, config] of Object.entries(settingsState.menuitems ?? {})) {
      if (config && !config.toggle) {
        css += `li[data-key=${menuItem}],section[data-key=${menuItem}]{display:var(--menuHidden) !important;transition:1s;}`;
      }
    }

    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to apply menu item visibility:", error);
  }
}
