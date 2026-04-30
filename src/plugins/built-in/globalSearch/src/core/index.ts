import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import {
  booleanSetting,
  buttonSetting,
  defineSettings,
  hotkeySetting,
  Setting,
} from "@/plugins/core/settingsHelpers";
import styles from "./styles.css?inline";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { runIndexing } from "../indexing/indexer";
import { initVectorSearch } from "../search/vector/vectorSearch";
import { cleanupSearchBar, mountSearchBar } from "./mountSearchBar";
import { IndexedDbManager } from "embeddia";
import { VectorWorkerManager } from "../indexing/worker/vectorWorkerManager";
import { checkAndHandleUpdate } from "../utils/versionCheck";
import {
  getStoredPassiveItems,
  installPassiveObserver,
} from "../indexing/passiveObserver";

// Platform-aware default hotkey
const getDefaultHotkey = () => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? "cmd+k" : "ctrl+k";
};

const settings = defineSettings({
  searchHotkey: hotkeySetting({
    default: getDefaultHotkey(),
    title: "Search Hotkey",
    description: "Keyboard shortcut to open the search",
  }),
  showRecentFirst: booleanSetting({
    default: true,
    title: "Show Recent First",
    description: "Sort dynamic content by most recent first",
  }),
  transparencyEffects: booleanSetting({
    default: true,
    title: "Transparency Effects",
    description: "Enable transparency effects for the search bar",
  }),
  runIndexingOnLoad: booleanSetting({
    default: true,
    title: "Index on Page Load",
    description: "Run content indexing when SEQTA loads",
  }),
  passiveIndexing: booleanSetting({
    default: true,
    title: "Index Browsed Content",
    description:
      "Capture safe text from SEQTA pages you visit so they're searchable. Sensitive routes (settings, files, login) are always excluded.",
  }),
  resetIndex: buttonSetting({
    title: "Reset Index",
    description: "Reset the search index and storage",
    trigger: async () => {
      const confirmed = confirm(
        "Reset the search index and all stored Global Search data?\n\nAfter this, reload this SEQTA tab so indexing can run again and rebuild the index.",
      );

      if (confirmed) {
        try {
          // Import resetDatabase function to properly close connections
          const { resetDatabase } = await import("../indexing/db");
          
          // Reset the vector worker first
          try {
            const workerManager = VectorWorkerManager.getInstance();
            await workerManager.resetWorker();
            console.log("Vector worker reset successfully");
          } catch (e) {
            console.warn("Failed to reset vector worker:", e);
          }

          // Close all database connections properly before deletion
          try {
            await resetDatabase();
          } catch (e) {
            console.warn("Failed to reset betterseqta-index database:", e);
          }

          // Wait a bit for connections to fully close
          await new Promise(resolve => setTimeout(resolve, 100));

          // Delete embeddiaDB (vector search database)
          const deleteDb = (dbName: string) => {
            return new Promise<void>((resolve, reject) => {
              const req = indexedDB.deleteDatabase(dbName);
              req.onsuccess = () => {
                console.log(`Successfully deleted database: ${dbName}`);
                resolve();
              };
              req.onerror = () => {
                console.error(`Error deleting database ${dbName}:`, req.error);
                reject(req.error);
              };
              req.onblocked = () => {
                console.warn(`Database ${dbName} deletion blocked - connections still open`);
                // Wait and retry once
                setTimeout(() => {
                  const retryReq = indexedDB.deleteDatabase(dbName);
                  retryReq.onsuccess = () => {
                    console.log(`Successfully deleted database on retry: ${dbName}`);
                    resolve();
                  };
                  retryReq.onerror = () => reject(retryReq.error);
                  retryReq.onblocked = () => {
                    reject(new Error(`One database is open, failed to remove: ${dbName}. Please close other tabs and try again.`));
                  };
                }, 500);
              };
            });
          };
          
          try {
            await deleteDb("embeddiaDB");
            await deleteDb("betterseqta-index");
            alert(
              "Search index and storage were reset.\n\nReload this tab to regenerate the index.",
            );
          } catch (e) {
            alert("Failed to reset one or more databases: " + String(e) + "\n\nTry closing other browser tabs and try again.");
          }
        } catch (e) {
          alert("Failed to reset index: " + String(e));
        }
      }
    },
  }),
});

class GlobalSearchPlugin extends BasePlugin<typeof settings> {
  @Setting(settings.searchHotkey)
  searchHotkey!: string;

  @Setting(settings.showRecentFirst)
  showRecentFirst!: boolean;

  @Setting(settings.transparencyEffects)
  transparencyEffects!: boolean;

  @Setting(settings.runIndexingOnLoad)
  runIndexingOnLoad!: boolean;

  @Setting(settings.passiveIndexing)
  passiveIndexing!: boolean;

  @Setting(settings.resetIndex)
  resetIndex!: () => void;
}

const settingsInstance = new GlobalSearchPlugin();

const globalSearchPlugin: Plugin<typeof settings> = {
  id: "global-search",
  name: "Global Search",
  description: "Quick search for everything in SEQTA",
  version: "1.0.0",
  settings: settingsInstance.settings,
  disableToggle: true,
  defaultEnabled: false,
  styles: styles,

  run: async (api) => {
    const appRef = { current: null };

    // Run the version check BEFORE we open any IndexedDB connections.
    // On a normal load (no version change) this is just a string compare
    // and a manifest read, so the cost is negligible. On a real update,
    // we want the database wipe to complete before `IndexedDbManager`
    // grabs a handle on `embeddiaDB`, otherwise the delete request comes
    // back blocked.
    try {
      const wasUpdated = await checkAndHandleUpdate();
      if (wasUpdated) {
        console.log(
          "[Global Search] Extension updated — search index reset; the next indexing pass will repopulate.",
        );
      }
    } catch (error: any) {
      // Firefox sometimes refuses CSS preloads or asset reads; we never
      // want this path to take the whole plugin down.
      if (
        error?.message?.includes("preload CSS") ||
        error?.message?.includes("MIME type") ||
        error?.message?.includes("NS_ERROR_CORRUPTED_CONTENT")
      ) {
        console.debug(
          "[Global Search] Version check skipped due to asset loading restrictions:",
          error.message,
        );
      } else {
        console.warn("[Global Search] Failed to check for updates:", error);
      }
    }

    try {
      await IndexedDbManager.create("embeddiaDB", "embeddiaObjectStore", {
        primaryKey: "id",
        autoIncrement: false,
      });
    } catch (error) {
      console.error("Failed to create IndexedDB:", error);
      // Continue execution - the search might still work without persistence
    }

    initVectorSearch();

    // Warm up vector worker in background to improve initial response time (skip in Firefox)
    setTimeout(async () => {
      try {
        // Only initialize worker if vector search is supported
        const { isVectorSearchSupported } = await import("../utils/browserDetection");
        if (isVectorSearchSupported()) {
          VectorWorkerManager.getInstance();
        } else {
          console.debug("[Global Search] Skipping vector worker warm-up (Firefox detected - using text search only)");
        }
      } catch (error) {
        console.warn("[Global Search] Vector worker warm-up failed:", error);
      }
    }, 1000);

    // Add debug helpers to window for troubleshooting
    // @ts-ignore
    window.globalSearchDebug = {
      resetWorker: async () => {
        const workerManager = VectorWorkerManager.getInstance();
        await workerManager.resetWorker();
        console.log("Vector worker reset via debug helper");
      },
      checkWorkerStatus: () => {
        const workerManager = VectorWorkerManager.getInstance();
        console.log("Streaming active:", workerManager.isStreamingActive());
      },
      passiveItems: async () => {
        const items = await getStoredPassiveItems();
        console.log(`Captured ${items.length} passive items`);
        return items;
      },
      runSelfTests: async () => {
        const { runGlobalSearchSelfTests } = await import(
          "../indexing/selfTests"
        );
        return runGlobalSearchSelfTests();
      },
      checkIndexedDBSize: async () => {
        try {
          const estimate = await navigator.storage.estimate();
          console.log("Storage estimate:", estimate);
          
          // Check embeddiaDB size
          const dbRequest = indexedDB.open("embeddiaDB");
          dbRequest.onsuccess = () => {
            const db = dbRequest.result;
            const transaction = db.transaction(["embeddiaObjectStore"], "readonly");
            const store = transaction.objectStore("embeddiaObjectStore");
            const countRequest = store.count();
            countRequest.onsuccess = () => {
              console.log("embeddiaDB item count:", countRequest.result);
            };
          };
        } catch (e) {
          console.error("Error checking storage:", e);
        }
      }
    };

    if (api.settings.passiveIndexing) {
      try {
        installPassiveObserver();
      } catch (error) {
        console.warn("[Global Search] Passive observer install failed:", error);
      }
    }

    if (api.settings.runIndexingOnLoad) {
      setTimeout(async () => {
        await runIndexing();
      }, 2000);
    }

    const title = document.querySelector("#title");

    if (title) {
      mountSearchBar(title, api, appRef);
    } else {
      const titleElement = await waitForElm("#title", true, 100, 60);
      mountSearchBar(titleElement, api, appRef);
    }

    return () => {
      cleanupSearchBar(appRef);
    };
  },
};

export default globalSearchPlugin;
