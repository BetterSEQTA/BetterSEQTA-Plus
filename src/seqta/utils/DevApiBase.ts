import browser from "webextension-polyfill";
import { PRODUCTION_API_BASE, resolveApiBase } from "@/seqta/utils/apiBasePolicy";

export { PRODUCTION_API_BASE } from "@/seqta/utils/apiBasePolicy";

const KEY = "bsplus_dev_api_base";

function readSessionOverride(): string | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const v = sessionStorage.getItem(KEY);
    if (v && /^https?:\/\//.test(v)) return v.replace(/\/$/, "");
  } catch {
    // sessionStorage may throw in some restricted contexts; fall back silently.
  }
  return null;
}

function currentBuildMode(): "development" | "production" {
  return import.meta.env.DEV ? "development" : "production";
}

/**
 * Returns the current content-API base URL.
 *
 * In production builds, Advanced settings may set a session-only override for server testing.
 * In extension dev builds, overrides are ignored and production is always used.
 */
export function getApiBase(): string {
  return resolveApiBase(currentBuildMode(), readSessionOverride());
}

/**
 * Persist a session-scoped override and broadcast it to the background script
 * so its `fetch` calls hit the same host.
 *
 * Pass `null` to clear the override. No-op in extension dev builds.
 */
export function setApiBase(url: string | null): void {
  if (import.meta.env.DEV) {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    void browser.runtime
      .sendMessage({ type: "setDevApiBase", url: null })
      .catch(() => {});
    return;
  }

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

/** Returns the override URL if one is currently active (production builds only). */
export function getStoredOverride(): string | null {
  if (import.meta.env.DEV) return null;
  return readSessionOverride();
}

/**
 * Send the current session override to the background script.
 * Call this early in page load so the background context stays in sync after
 * service-worker restarts.
 */
export function syncApiBaseToBackground(): void {
  const override = import.meta.env.DEV ? null : readSessionOverride();
  void browser.runtime
    .sendMessage({ type: "setDevApiBase", url: override })
    .catch(() => {});
}
