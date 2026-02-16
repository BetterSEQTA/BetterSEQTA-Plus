import { defineLazyPlugin } from "../../core/dynamicLoader";
import {
  booleanSetting,
  buttonSetting,
  defineSettings,
  hotkeySetting,
} from "../../core/settingsHelpers";
import styles from "./src/core/styles.css?inline";

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
          // Dynamically import modules to avoid loading heavy dependencies
          const { VectorWorkerManager } = await import("./src/indexing/worker/vectorWorkerManager");
          const { resetDatabase } = await import("./src/indexing/db");
          
          // Reset vector worker first
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

// Create the lazy plugin definition - this loads immediately but doesn't import heavy dependencies
export default defineLazyPlugin({
  id: "global-search",
  name: "Global Search",
  description: "Quick search for everything in SEQTA",
  version: "1.0.0",
  settings,
  disableToggle: true,
  defaultEnabled: false,
  beta: true,
  styles: styles,
  
  // Lazy loader - only imports the heavy plugin when actually needed
  loader: () => import("./src/core/index")
});
