import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import {
  booleanSetting,
  buttonSetting,
  defineSettings,
  Setting,
  hotkeySetting,
} from "@/plugins/core/settingsHelpers";
import styles from "./styles.css?inline";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { runIndexing } from "../indexing/indexer";
import { initVectorSearch } from "../search/vector/vectorSearch";
import { cleanupSearchBar, mountSearchBar } from "./mountSearchBar";
import { IndexedDbManager } from "embeddia";
import { VectorWorkerManager } from "../indexing/worker/vectorWorkerManager";
import { checkAndHandleUpdate } from "../utils/versionCheck";

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
  resetIndex: buttonSetting({
    title: "Reset Index",
    description: "Reset the search index and storage",
    trigger: async () => {
      const confirmed = confirm("Are you sure you want to reset the search index and storage?");

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
            console.log("betterseqta-index database closed and reset");
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
            alert("Search index and storage have been reset successfully.");
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
  beta: true,
  styles: styles,

  run: async (api) => {
    const appRef = { current: null };

    // Check for extension updates and clear caches if needed
    // Use a timeout to avoid blocking initialization
    setTimeout(async () => {
      try {
        const wasUpdated = await checkAndHandleUpdate();
        if (wasUpdated) {
          console.log("[Global Search] Extension updated - caches cleared");
        }
      } catch (error: any) {
        // Handle CSS preload errors and other failures gracefully
        // These can happen in Firefox or when assets aren't available
        if (error?.message?.includes("preload CSS") || 
            error?.message?.includes("MIME type") || 
            error?.message?.includes("NS_ERROR_CORRUPTED_CONTENT")) {
          console.debug("[Global Search] Version check skipped due to asset loading restrictions:", error.message);
        } else {
          console.warn("[Global Search] Failed to check for updates:", error);
        }
      }
    }, 100);

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
