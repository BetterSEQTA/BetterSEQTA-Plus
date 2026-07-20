import { SCHEMA_VERSION_KEY } from "./schemaVersion";
import { pauseIndexingUntilReload } from "./indexingPause";
import { pausePassiveObserver } from "./passiveObserver";
import browser from "webextension-polyfill";

export const RESET_INDEX_MESSAGE = "global-search-reset-index";

let resetMessageListenerInstalled = false;

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
    /* ignore */
  }

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
