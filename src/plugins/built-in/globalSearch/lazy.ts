import { defineLazyPlugin } from "../../core/dynamicLoader";
import {
  booleanSetting,
  buttonSetting,
  defineSettings,
  hotkeySetting,
} from "../../core/settingsHelpers";
import { isSeqtaEngageExperience, isSeqtaLoginPage } from "@/seqta/utils/isSeqtaEngage";
import styles from "./src/core/styles.css?inline";
import {
  resetSearchIndexes,
  notifyOpenTabsResetSearchIndex,
} from "./src/indexing/resetIndexes";
import {
  formatHotkeyForDisplay,
  getDefaultSearchHotkey,
  isValidHotkey,
} from "./src/utils/hotkeyUtils";
import { titleBarState } from "@/seqta/ui/titlebar/titleBarState.svelte";

const settings = defineSettings({
  searchHotkey: hotkeySetting({
    default: getDefaultSearchHotkey(),
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
      if (!confirmed) return;

      try {
        await notifyOpenTabsResetSearchIndex();
        await resetSearchIndexes();
        alert(
          "Search index and storage were reset.\n\nReload this tab to regenerate the index.",
        );
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

/**
 * Shell loads immediately so the Quick Search chip can show in the title bar.
 * Heavy indexing / SearchBar chunk stays in the lazy core loader.
 */
const globalSearchPlugin = defineLazyPlugin({
  id: "global-search",
  name: "Global Search",
  description: "Quick search for everything in SEQTA",
  version: "1.0.0",
  settings,
  disableToggle: true,
  defaultEnabled: false,
  styles,
  loader: () => import("./src/core/index"),
});

const runGlobalSearch = globalSearchPlugin.run!;

globalSearchPlugin.run = async (api) => {
  if (isSeqtaEngageExperience() || isSeqtaLoginPage()) return () => {};

  // Eager chrome (like Analytics menu injection) — heavy chunk loads behind it.
  const hotkey = isValidHotkey(api.settings.searchHotkey ?? "")
    ? (api.settings.searchHotkey as string)
    : getDefaultSearchHotkey();
  titleBarState.searchHotkeyLabel = formatHotkeyForDisplay(hotkey);
  titleBarState.showSearch = true;

  let heavyCleanup: (() => void) | void;
  const heavyPromise = runGlobalSearch(api).then((cleanup) => {
    heavyCleanup = cleanup;
  });

  return () => {
    titleBarState.showSearch = false;
    void heavyPromise.then(() => {
      if (typeof heavyCleanup === "function") heavyCleanup();
    });
    if (typeof heavyCleanup === "function") heavyCleanup();
  };
};

export default globalSearchPlugin;
