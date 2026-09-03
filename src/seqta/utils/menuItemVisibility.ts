import { settingsState } from "./listeners/SettingsState";
import { rafThrottle } from "@/seqta/utils/rafThrottle";

const STYLE_ID = "bsplus-menuitem-visibility";
let lastCss = "";

function buildMenuItemVisibilityCss(): string {
  let css = "";
  for (const [menuItem, config] of Object.entries(settingsState.menuitems ?? {})) {
    if (config && !config.toggle) {
      // Scope to the native SEQTA list only — the custom Svelte sidebar
      // filters visibility in JS and must not be forced hidden by this rule.
      css += `#menu > ul:not(#bsplus-sidebar-root) li[data-key=${menuItem}],#menu > ul:not(#bsplus-sidebar-root) section[data-key=${menuItem}]{display:var(--menuHidden) !important;}`;
    }
  }
  return css;
}

/** Apply hide rules from `menuitems` (re-runnable after edit / storage sync). */
export function applyMenuItemVisibility(): void {
  if (document.querySelector(".editmenuoption-container")) return;

  try {
    const css = buildMenuItemVisibilityCss();
    if (css === lastCss) return;
    lastCss = css;

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

/** Coalesce rapid menuitems updates (storage + sidebar edit). */
export const scheduleMenuItemVisibility = rafThrottle(applyMenuItemVisibility);
