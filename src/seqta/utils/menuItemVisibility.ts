import { settingsState } from "./listeners/SettingsState";

const STYLE_ID = "bsplus-menuitem-visibility";

function isEditSidebarOpen(): boolean {
  return document.querySelector(".editmenuoption-container") != null;
}

function hideRule(menuItem: string): string {
  return `li[data-key=${menuItem}],section[data-key=${menuItem}]{display:var(--menuHidden) !important;transition:1s;}`;
}

/** Whether a sidebar key is hidden via Edit Sidebar toggles. */
export function isMenuItemHidden(key: string): boolean {
  const items = settingsState.menuitems as Record<string, { toggle?: boolean }>;
  const entry = items?.[key];
  return entry != null && entry.toggle === false;
}

/** Apply hide rules from `menuitems` (re-runnable after edit / storage sync). */
export function applyMenuItemVisibility(): void {
  if (isEditSidebarOpen()) return;

  try {
    let css = "";
    for (const [menuItem, config] of Object.entries(
      settingsState.menuitems ?? {},
    )) {
      if (config && !config.toggle) {
        css += hideRule(menuItem);
        console.info(`[BetterSEQTA+] Hiding ${menuItem} menu item`);
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
