import { settingsState } from "./listeners/SettingsState";
import { verboseInfo } from "@/utils/verboseLog";

const STYLE_ID = "bsplus-menuitem-visibility";

/** Whether a sidebar key is hidden via Edit Sidebar toggles. */
export function isMenuItemHidden(key: string): boolean {
  const entry = (settingsState.menuitems as Record<string, { toggle?: boolean }>)?.[key];
  return entry != null && entry.toggle === false;
}

/** Apply hide rules from `menuitems` (re-runnable after edit / storage sync). */
export function applyMenuItemVisibility(): void {
  if (document.querySelector(".editmenuoption-container")) return;

  try {
    let css = "";
    for (const [menuItem, config] of Object.entries(settingsState.menuitems ?? {})) {
      if (config && !config.toggle) {
        css += `li[data-key=${menuItem}],section[data-key=${menuItem}]{display:var(--menuHidden) !important;transition:1s;}`;
        verboseInfo(`[BetterSEQTA+] Hiding ${menuItem} menu item`);
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
