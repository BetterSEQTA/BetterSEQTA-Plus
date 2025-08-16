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
          // Dynamically import the worker manager to avoid loading heavy dependencies
          const { VectorWorkerManager } = await import("./src/indexing/worker/vectorWorkerManager");
          const workerManager = VectorWorkerManager.getInstance();
          await workerManager.resetWorker();
          console.log("Vector worker reset successfully");
        } catch (e) {
          console.warn("Failed to reset vector worker:", e);
        }

        // Delete both 'embeddiaDB' and 'betterseqta-index' using native IndexedDB APIs
        const deleteDb = (dbName: string) => {
          return new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase(dbName);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            req.onblocked = () => {
              reject(new Error(`One database is open, failed to remove: ${dbName}`));
            };
          });
        };
        try {
          await deleteDb("embeddiaDB");
          await deleteDb("betterseqta-index");
          alert("Search index and storage have been reset.");
        } catch (e) {
          alert("Failed to reset one or more databases: " + String(e));
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
