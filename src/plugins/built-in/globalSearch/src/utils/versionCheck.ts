import browser from "webextension-polyfill";

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
 * Checks if the extension has been updated and clears caches if needed
 * Returns true if an update was detected
 */
export async function checkAndHandleUpdate(): Promise<boolean> {
  const currentVersion = getCurrentVersion();
  const storedVersion = getStoredVersion();
  
  // If no stored version, this is first run - store current version
  if (!storedVersion) {
    console.debug(`[Version Check] First run detected, storing version ${currentVersion}`);
    storeVersion(currentVersion);
    return false;
  }
  
  // If versions match, no update
  if (storedVersion === currentVersion) {
    return false;
  }
  
  // Version mismatch detected - extension was updated
  console.log(`[Version Check] Extension updated from ${storedVersion} to ${currentVersion}, clearing caches...`);
  
  // Clear all caches
  await clearAllCaches();
  
  // Store new version
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
    try {
      const { clearSearchCache } = await import("../search/searchUtils");
      clearSearchCache();
    } catch (e) {
      // Module might not be loaded yet, that's okay
    }
    
    try {
      const { clearEmbeddingCache } = await import("../search/vector/vectorSearch");
      clearEmbeddingCache();
    } catch (e) {
      // Module might not be loaded yet, that's okay
    }
    
    console.debug("[Version Check] All caches cleared");
  } catch (e) {
    console.error("[Version Check] Error clearing caches:", e);
  }
}

