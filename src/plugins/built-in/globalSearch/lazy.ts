import { defineLazyPlugin } from "../../core/dynamicLoader";
import {
  booleanSetting,
  buttonSetting,
  defineSettings,
  hotkeySetting,
} from "../../core/settingsHelpers";
import styles from "./src/core/styles.css?inline";
import { resetSearchIndexes } from "./src/indexing/resetIndexes";

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
        "Are you sure you want to reset the search index and storage?",
      );
      if (!confirmed) return;

      try {
        // `resetSearchIndexes` is a tiny statically-imported helper: no
        // dynamic chunks to chase, so the button keeps working even when
        // the settings page has been open across an extension update.
        await resetSearchIndexes();
        alert("Search index and storage have been reset successfully.");
      } catch (e) {
        alert(
          "Failed to reset index: " +
            String(e) +
            "\n\nTry closing other browser tabs and try again.",
        );
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
  styles: styles,
  
  // Lazy loader - only imports the heavy plugin when actually needed
  loader: () => import("./src/core/index")
});
