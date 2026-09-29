import browser from "webextension-polyfill";

/** Maintainer note: the light/dark toggle easter egg (10 clicks) plays a Rick Roll video. */
const PAGE_SCRIPT_RESOURCE = "resources/themeToggleSurprisePage.js";
const POPOUT_ROOT_ID = "bsplus-ld-surprise-root";
const PLAYER_MOUNT_ID = "bsplus-ld-surprise-player";
const PAGE_SCRIPT_ID = "bsplus-theme-surprise-page-script";
const MESSAGE_SOURCE = "betterseqta-theme-surprise";

export const THEME_TOGGLE_SURPRISE_TRIGGER_AT = 10;

let playerRoot: HTMLElement | null = null;
let pageScriptInjected = false;

function hostElement(): HTMLElement {
  return document.getElementById("container") ?? document.body;
}

function postToPageContext(type: "open" | "close", mountId?: string): void {
  window.postMessage(
    {
      source: MESSAGE_SOURCE,
      type,
      mountId,
    },
    "*",
  );
}

/** Loads YouTube IFrame API in the page context (mirrors the test HTML setup). */
export function ensureThemeToggleSurprisePageScript(): void {
  if (pageScriptInjected || document.getElementById(PAGE_SCRIPT_ID)) {
    pageScriptInjected = true;
    return;
  }

  const script = document.createElement("script");
  script.id = PAGE_SCRIPT_ID;
  script.src = browser.runtime.getURL(PAGE_SCRIPT_RESOURCE);
  (document.head || document.documentElement).appendChild(script);
  pageScriptInjected = true;
}

function ensurePlayerShell(): void {
  if (playerRoot) return;

  const root = document.createElement("div");
  root.id = POPOUT_ROOT_ID;
  root.className = "bsplus-ld-surprise-root";

  const aside = document.createElement("aside");
  aside.className = "bsplus-ld-surprise-popout";
  aside.setAttribute("role", "dialog");
  aside.setAttribute("aria-label", "Video player");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "bsplus-ld-surprise-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.addEventListener("click", closeThemeToggleSurprise);

  const mount = document.createElement("div");
  mount.id = PLAYER_MOUNT_ID;
  mount.className = "bsplus-ld-surprise-player";

  aside.append(closeBtn, mount);
  root.append(aside);
  hostElement().append(root);

  playerRoot = root;
}

export function closeThemeToggleSurprise(): void {
  postToPageContext("close");
  playerRoot?.remove();
  playerRoot = null;
}

export function openThemeToggleSurprise(): void {
  ensureThemeToggleSurprisePageScript();
  ensurePlayerShell();
  postToPageContext("open", PLAYER_MOUNT_ID);
}
