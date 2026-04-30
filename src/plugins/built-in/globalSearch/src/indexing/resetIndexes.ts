import { SCHEMA_VERSION_KEY } from "./schemaVersion";

/**
 * Hard-reset of all global-search persistence.
 *
 * This module is intentionally dependency-free (no imports from `db.ts`,
 * the worker manager, embeddia, or any heavy bundle) so it can be
 * statically imported from:
 *
 *  - The always-loaded plugin shell (`lazy.ts`) for the manual
 *    "Reset Index" settings button. Statically importing means the button
 *    keeps working across extension updates — there's no chunk hash to
 *    chase via dynamic import, which previously produced
 *    `Failed to fetch dynamically imported module: .../assets/<chunk>.js`
 *    when an older settings page tried to load a chunk that the new build
 *    had already replaced.
 *
 *  - The version-check path (`utils/versionCheck.ts`) for the auto-reset
 *    that fires whenever the extension's manifest version changes.
 *
 * The function:
 *   1. Notifies in-process modules to drop in-memory caches and any open
 *      IndexedDB connections via custom DOM events (best effort).
 *   2. Deletes the structured `betterseqta-index` and the vector
 *      `embeddiaDB` databases.
 *   3. Clears version-tracking localStorage keys so the next indexing
 *      pass treats the world as fresh.
 *
 * It never throws on partial failure: each step is wrapped in try/catch
 * so a stuck connection on one DB doesn't block the other.
 */

const STRUCTURED_DB = "betterseqta-index";
const VECTOR_DB = "embeddiaDB";
const STRUCTURED_VERSION_KEY = "betterseqta-index-version";

function deleteIndexedDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };

    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.deleteDatabase(name);
    } catch (e) {
      console.warn(`[Reset] Could not start delete of ${name}:`, e);
      finish();
      return;
    }

    req.onsuccess = () => finish();
    req.onerror = () => {
      console.warn(`[Reset] Error deleting ${name}:`, req.error);
      finish();
    };
    req.onblocked = () => {
      // Connections are still open in another tab. Wait briefly, retry,
      // then resolve regardless so we never hang the caller forever.
      console.warn(
        `[Reset] Delete of ${name} blocked; will retry then resolve.`,
      );
      setTimeout(() => {
        try {
          const retry = indexedDB.deleteDatabase(name);
          retry.onsuccess = () => finish();
          retry.onerror = () => finish();
          retry.onblocked = () => finish();
        } catch {
          finish();
        }
      }, 600);
    };
  });
}

export async function resetSearchIndexes(): Promise<void> {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("betterseqta-clear-search-cache"),
      );
      window.dispatchEvent(
        new CustomEvent("betterseqta-clear-embedding-cache"),
      );
      window.dispatchEvent(
        new CustomEvent("betterseqta-reset-search-index"),
      );
    }
  } catch {
    /* ignore — events are best-effort */
  }

  // Give listeners a tick to close any open IDB connections; otherwise
  // the delete request below comes back with `onblocked`.
  await new Promise<void>((resolve) => setTimeout(resolve, 150));

  await Promise.allSettled([
    deleteIndexedDb(STRUCTURED_DB),
    deleteIndexedDb(VECTOR_DB),
  ]);

  try {
    localStorage.removeItem(STRUCTURED_VERSION_KEY);
    localStorage.removeItem(SCHEMA_VERSION_KEY);
  } catch {
    /* ignore */
  }
}
