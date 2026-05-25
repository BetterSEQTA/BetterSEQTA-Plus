import browser from "webextension-polyfill";
import { resetSearchIndexes } from "../indexing/resetIndexes";

const VERSION_STORAGE_KEY = "betterseqta-global-search-version";
const VERSION_CACHE_KEY = "betterseqta-global-search-cache-version";

/**
 * Gets the current extension version from the manifest
 */
export function getCurrentVersion(): string {
  try {
    return browser.runtime.getManifest().version;
  } catch (e) {
    console.warn("[Version Check] Failed to get manifest version:", e);
    return "0.0.0";
  }
}

/**
 * Gets the last stored version from localStorage
 */
export function getStoredVersion(): string | null {
  try {
    return localStorage.getItem(VERSION_STORAGE_KEY);
  } catch (e) {
    console.warn("[Version Check] Failed to get stored version:", e);
    return null;
  }
}

/**
 * Stores the current version in localStorage
 */
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
 * search index if needed.
 *
 * The reset is intentionally aggressive: every manifest version bump
 * triggers a full IndexedDB wipe so changes to indexer extraction logic,
 * job sets, or item shape can never serve stale results from an older
 * build. The next indexing pass will repopulate from scratch in the
 * background. Re-population is bounded by the per-job rate limits in
 * `api.ts` so it can't hammer SEQTA after an update.
 *
 * Returns true if an update was detected.
 */
export async function checkAndHandleUpdate(): Promise<boolean> {
  const currentVersion = getCurrentVersion();
  const storedVersion = getStoredVersion();

  // First run: just remember the version, don't reset (the user likely
  // just installed the extension; the index is already empty).
  if (!storedVersion) {
    console.debug(
      `[Version Check] First run detected, storing version ${currentVersion}`,
    );
    storeVersion(currentVersion);
    return false;
  }

  if (storedVersion === currentVersion) {
    return false;
  }

  console.log(
    `[Version Check] Extension updated from ${storedVersion} to ${currentVersion}, resetting search index...`,
  );

  await clearAllCaches();

  try {
    await resetSearchIndexes();
    console.log(
      "[Version Check] Search index reset; next indexing pass will repopulate from scratch.",
    );
  } catch (e) {
    console.warn("[Version Check] resetSearchIndexes failed:", e);
  }

  storeVersion(currentVersion);

  return true;
}

/**
 * Clears all search-related caches
 */
export async function clearAllCaches(): Promise<void> {
  try {
    // Clear search result cache (in-memory Map)
    if (typeof window !== 'undefined') {
      // Dispatch event to clear caches in other modules
      window.dispatchEvent(new CustomEvent('betterseqta-clear-search-cache'));
      window.dispatchEvent(new CustomEvent('betterseqta-clear-embedding-cache'));
    }
    
    // Also try to directly clear caches if modules are already loaded
    // Use setTimeout to avoid blocking and handle CSS preload errors
    setTimeout(async () => {
      try {
        const { clearSearchCache } = await import("../search/searchUtils");
        clearSearchCache();
      } catch (e: any) {
        // Module might not be loaded yet, or CSS preload error - that's okay
        if (!e?.message?.includes("preload CSS") && !e?.message?.includes("MIME type")) {
          console.debug("[Version Check] Could not clear search cache:", e);
        }
      }
      
      try {
        const { clearEmbeddingCache } = await import("../search/vector/vectorSearch");
        clearEmbeddingCache();
      } catch (e: any) {
        // Module might not be loaded yet, or CSS preload error - that's okay
        if (!e?.message?.includes("preload CSS") && !e?.message?.includes("MIME type")) {
          console.debug("[Version Check] Could not clear embedding cache:", e);
        }
      }
    }, 50);
    
    console.debug("[Version Check] All caches cleared");
  } catch (e) {
    console.error("[Version Check] Error clearing caches:", e);
  }
}

