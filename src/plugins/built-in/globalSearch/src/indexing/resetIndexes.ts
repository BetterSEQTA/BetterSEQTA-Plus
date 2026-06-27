import { SCHEMA_VERSION_KEY } from "./schemaVersion";
import { pauseIndexingUntilReload } from "./indexingPause";
import { pausePassiveObserver } from "./passiveObserver";
import browser from "webextension-polyfill";

export const RESET_INDEX_MESSAGE = "global-search-reset-index";

let resetMessageListenerInstalled = false;

/** Notify open SEQTA tabs to pause indexing and wipe page-origin stores. */
export async function notifyOpenTabsResetSearchIndex(): Promise<void> {
  const tabs = await browser.tabs.query({});
  await Promise.allSettled(
    tabs.map((tab) =>
      tab.id != null
        ? browser.tabs.sendMessage(tab.id, { type: RESET_INDEX_MESSAGE })
        : Promise.resolve(),
    ),
  );
}

/** Content scripts: handle reset broadcast from the settings popup. */
export function installResetIndexMessageListener(): void {
  if (resetMessageListenerInstalled) return;
  resetMessageListenerInstalled = true;

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type !== RESET_INDEX_MESSAGE) return;
    pauseIndexingUntilReload();
    pausePassiveObserver();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("indexing-progress", {
          detail: {
            completed: 0,
            total: 0,
            indexing: false,
            status: "Indexing paused — reload to rebuild",
          },
        }),
      );
    }
    void resetSearchIndexes();
  });
}

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryDeleteDatabase(
  name: string,
): Promise<"success" | "blocked" | "error"> {
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.deleteDatabase(name);
    } catch (error) {
      console.warn(`[Reset] Could not start delete of ${name}:`, error);
      resolve("error");
      return;
    }

    req.onsuccess = () => resolve("success");
    req.onerror = () => {
      console.warn(`[Reset] Error deleting ${name}:`, req.error);
      resolve("error");
    };
    req.onblocked = () => resolve("blocked");
  });
}

async function deleteIndexedDb(name: string): Promise<void> {
  const maxAttempts = 6;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await tryDeleteDatabase(name);
    if (result === "success") return;

    if (result === "blocked") {
      console.warn(
        `[Reset] Delete of ${name} blocked (attempt ${attempt + 1}/${maxAttempts}); waiting for connections to close`,
      );
    }

    await delay(200 * (attempt + 1));
  }

  console.warn(`[Reset] Gave up deleting ${name} after ${maxAttempts} attempts`);
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
  await delay(300);

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
