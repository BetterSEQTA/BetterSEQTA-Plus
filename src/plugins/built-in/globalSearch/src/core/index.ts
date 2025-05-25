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
        // Delete both 'embeddiaDB' and 'betterseqta-index' using native IndexedDB APIs
        const deleteDb = (dbName: string) => {
          return new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase(dbName);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            req.onblocked = () => {
              alert(`Please close all other tabs using this app to reset the database: ${dbName}`);
              reject(new Error('Delete blocked'));
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
