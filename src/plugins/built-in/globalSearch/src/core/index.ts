// Import necessary types and helpers for the plugin system
import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import {
  booleanSetting,
  defineSettings,
  Setting,
  stringSetting,
} from "@/plugins/core/settingsHelpers";
// Import the CSS styles for the plugin
import styles from "./styles.css?inline";
// Import utility functions
import { waitForElm } from "@/seqta/utils/waitForElm";
import { runIndexing } from "../indexing/indexer";
import { initVectorSearch } from "../search/vector/vectorSearch";
import { cleanupSearchBar, mountSearchBar } from "./mountSearchBar";
import { IndexedDbManager } from "embeddia";

// Define the plugin settings using the helper functions
const settings = defineSettings({
  // Define a setting for the search hotkey with a default value
  searchHotkey: stringSetting({
    default: "ctrl+k",
    title: "Search Hotkey",
    description: "Keyboard shortcut to open the search (cmd on Mac)",
  }),
  // Define a setting to show recent items first in dynamic content
  showRecentFirst: booleanSetting({
    default: true,
    title: "Show Recent First",
    description: "Sort dynamic content by most recent first",
  }),
  // Define a setting for enabling transparency effects in the search bar
  transparencyEffects: booleanSetting({
    default: true,
    title: "Transparency Effects",
    description: "Enable transparency effects for the search bar",
  }),
  // Define a setting to run indexing when the page loads
  runIndexingOnLoad: booleanSetting({
    default: true,
    title: "Index on Page Load",
    description: "Run content indexing when SEQTA loads",
  }),
});

// Class definition for the GlobalSearchPlugin, extending BasePlugin to handle the settings
class GlobalSearchPlugin extends BasePlugin<typeof settings> {
  // Bind settings to the class properties
  @Setting(settings.searchHotkey)
  searchHotkey!: string;

  @Setting(settings.showRecentFirst)
  showRecentFirst!: boolean;

  @Setting(settings.transparencyEffects)
  transparencyEffects!: boolean;

  @Setting(settings.runIndexingOnLoad)
  runIndexingOnLoad!: boolean;
}

// Create an instance of the plugin settings
const settingsInstance = new GlobalSearchPlugin();

// Define the plugin's main structure
const globalSearchPlugin: Plugin<typeof settings> = {
  id: "global-search", // Unique identifier for the plugin
  name: "Global Search", // Display name of the plugin
  description: "Quick search for everything in SEQTA", // Description of the plugin functionality
  version: "1.0.0", // Plugin version
  settings: settingsInstance.settings, // Attach the plugin settings
  disableToggle: true, // Disable the toggle for enabling/disabling the plugin
  defaultEnabled: false, // Default state of the plugin is disabled
  styles: styles, // Attach the CSS styles for the plugin

  // Main function that runs when the plugin is activated
  run: async (api) => {
    const appRef = { current: null }; // Reference to the app element

    // Create the IndexedDB instance for storing indexed data
    await IndexedDbManager.create("embeddiaDB", "embeddiaObjectStore", {
      primaryKey: "id", // Primary key for the object store
      autoIncrement: false, // Prevent auto-incrementing the primary key
    });

    // Initialize the vector-based search functionality
    initVectorSearch();

    // If the setting to run indexing on load is enabled, run the indexing function
    if (api.settings.runIndexingOnLoad) {
      setTimeout(async () => {
        await runIndexing(); // Run the indexing after a 2-second delay
      }, 2000);
    }

    // Try to find the element with the id "title" to mount the search bar
    const title = document.querySelector("#title");

    if (title) {
      // If the title element is found, mount the search bar
      mountSearchBar(title, api, appRef);
    } else {
      // If the title element is not found, wait for it to appear and then mount the search bar
      await waitForElm("#title", true, 100, 60);
      mountSearchBar(document.querySelector("#title") as Element, api, appRef);
    }

    // Cleanup function to remove the search bar when the plugin is deactivated
    return () => {
      cleanupSearchBar(appRef);
    };
  },
};

// Export the plugin for use
export default globalSearchPlugin;
