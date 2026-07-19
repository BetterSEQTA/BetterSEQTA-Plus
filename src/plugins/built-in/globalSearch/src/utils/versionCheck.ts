import browser from "webextension-polyfill";
import { resetSearchIndexes } from "../indexing/resetIndexes";
import { verboseDebug, verboseLog } from "@/utils/verboseLog";

const VERSION_STORAGE_KEY = "betterseqta-global-search-version";
const VERSION_CACHE_KEY = "betterseqta-global-search-cache-version";

const isAssetLoadError = (e: unknown) => {
  const msg = (e as { message?: string })?.message ?? "";
  return msg.includes("preload CSS") || msg.includes("MIME type");
};

export function getCurrentVersion(): string {
  try {
    return browser.runtime.getManifest().version;
  } catch (e) {
    console.warn("[Version Check] Failed to get manifest version:", e);
    return "0.0.0";
  }
}

export function getStoredVersion(): string | null {
  try {
    return localStorage.getItem(VERSION_STORAGE_KEY);
  } catch (e) {
    console.warn("[Version Check] Failed to get stored version:", e);
    return null;
  }
}

export function storeVersion(version: string): void {
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, version);
    localStorage.setItem(VERSION_CACHE_KEY, version);
  } catch (e) {
    console.warn("[Version Check] Failed to store version:", e);
  }
}

/**
 * Checks if the extension has been updated and clears caches + resets the
 * search index if needed. Returns true if an update was detected.
 */
export async function checkAndHandleUpdate(): Promise<boolean> {
  const currentVersion = getCurrentVersion();
  const storedVersion = getStoredVersion();

  if (!storedVersion) {
    verboseDebug(`[Version Check] First run detected, storing version ${currentVersion}`);
    storeVersion(currentVersion);
    return false;
  }

  if (storedVersion === currentVersion) return false;

  verboseLog(
    `[Version Check] Extension updated from ${storedVersion} to ${currentVersion}, resetting search index...`,
  );

  await clearAllCaches();

  try {
    await resetSearchIndexes();
    verboseLog("[Version Check] Search index reset; next indexing pass will repopulate from scratch.");
  } catch (e) {
    console.warn("[Version Check] resetSearchIndexes failed:", e);
  }

  storeVersion(currentVersion);
  return true;
}

export async function clearAllCaches(): Promise<void> {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("betterseqta-clear-search-cache"));
      window.dispatchEvent(new CustomEvent("betterseqta-clear-embedding-cache"));
    }

    setTimeout(async () => {
      try {
        const { clearSearchCache } = await import("../search/searchUtils");
        clearSearchCache();
      } catch (e) {
        if (!isAssetLoadError(e)) verboseDebug("[Version Check] Could not clear search cache:", e);
      }

      try {
        const { clearEmbeddingCache } = await import("../search/vector/vectorSearch");
        clearEmbeddingCache();
      } catch (e) {
        if (!isAssetLoadError(e)) verboseDebug("[Version Check] Could not clear embedding cache:", e);
      }
    }, 50);

    verboseDebug("[Version Check] All caches cleared");
  } catch (e) {
    console.error("[Version Check] Error clearing caches:", e);
  }
}
