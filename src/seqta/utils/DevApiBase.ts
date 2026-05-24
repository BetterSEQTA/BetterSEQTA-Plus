import browser from "webextension-polyfill";

const DEFAULT_BASE = "https://betterseqta.org";
const KEY = "bsplus_dev_api_base";

/**
 * Returns the current content-API base URL.
 *
 * Reads from `sessionStorage` so a developer can temporarily override the
 * server for testing. The value is cleared when the browser session ends,
 * leaving production traffic unaffected for normal users.
 */
export function getApiBase(): string {
  try {
    if (typeof sessionStorage === "undefined") return DEFAULT_BASE;
    const v = sessionStorage.getItem(KEY);
    if (v && /^https?:\/\//.test(v)) return v.replace(/\/$/, "");
  } catch {
    // sessionStorage may throw in some restricted contexts; fall back silently.
  }
  return DEFAULT_BASE;
}

/**
 * Persist a session-scoped override and broadcast it to the background script
 * so its `fetch` calls hit the same host.
 *
 * Pass `null` to clear the override.
 */
export function setApiBase(url: string | null): void {
  try {
    if (!url) {
      sessionStorage.removeItem(KEY);
    } else {
      sessionStorage.setItem(KEY, url.replace(/\/$/, ""));
    }
  } catch {
    // ignore
  }
  void browser.runtime
    .sendMessage({ type: "setDevApiBase", url: url || null })
    .catch(() => {});
}

/** Returns the override URL if one is currently set in this session. */
export function getStoredOverride(): string | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * Send the current session override to the background script.
 * Call this early in page load so the background context stays in sync after
 * service-worker restarts.
 */
export function syncApiBaseToBackground(): void {
  const override = getStoredOverride();
  void browser.runtime
    .sendMessage({ type: "setDevApiBase", url: override })
    .catch(() => {});
}
