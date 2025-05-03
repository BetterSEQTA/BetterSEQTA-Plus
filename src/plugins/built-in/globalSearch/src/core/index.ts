import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import {
  booleanSetting,
  defineSettings,
  Setting,
  stringSetting,
} from "@/plugins/core/settingsHelpers";
import styles from "./styles.css?inline";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { runIndexing } from "../indexing/indexer";
import { initVectorSearch } from "../search/vector/vectorSearch";
import { cleanupSearchBar, mountSearchBar } from "./mountSearchBar";

const settings = defineSettings({
  searchHotkey: stringSetting({
    default: "ctrl+k",
    title: "Search Hotkey",
    description: "Keyboard shortcut to open the search (cmd on Mac)",
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
      await waitForElm("#title", true, 100, 60);
      mountSearchBar(document.querySelector("#title") as Element, api, appRef);
    }

    return () => {
      cleanupSearchBar(appRef);
    };
  },
};

export default globalSearchPlugin;
