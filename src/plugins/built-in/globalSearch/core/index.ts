import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import {
  booleanSetting,
  defineSettings,
  Setting,
  stringSetting,
} from "@/plugins/core/settingsHelpers";
import renderSvelte from "@/interface/main";
import SearchBar from "../SearchBar.svelte";
import styles from "./styles.css?inline";
import { unmount } from "svelte";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { runIndexing } from "../indexing/indexer";
import { VectorWorkerManager } from "../indexing/worker/vectorWorkerManager";
import { initVectorSearch } from "../search/vector/vectorSearch";

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
  styles: styles,

  run: async (api) => {
    let app: any;

    initVectorSearch();

    // Run initial indexing and update dynamic items
    if (api.settings.runIndexingOnLoad) {
      setTimeout(async () => {
        await runIndexing();
      }, 2000); // Delay initial indexing to let page load
    }

    const mountSearchBar = (titleElement: Element) => {
      if (titleElement.querySelector(".search-trigger")) {
        return;
      }

      const searchButton = document.createElement("div");
      searchButton.className = "search-trigger";
      searchButton.innerHTML = /* html */ `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>

        <p>Quick search...</p>
        <span style="margin-left: auto; display: flex; align-items: center; color: #777; font-size: 12px;">⌘K</span>
      `;

      titleElement.appendChild(searchButton);

      const searchRoot = document.createElement("div");
      document.body.appendChild(searchRoot);
      const searchRootShadow = searchRoot.attachShadow({ mode: "open" });

      console.log("adding event listener to search button");

      searchButton.addEventListener("click", () => {
        console.log("search button clicked");
        // @ts-ignore - Intentionally adding to window
        window.setCommandPalleteOpen(true);
      });

      try {
        app = renderSvelte(SearchBar, searchRootShadow, {
          transparencyEffects: api.settings.transparencyEffects ? true : false,
          showRecentFirst: api.settings.showRecentFirst,
        });
      } catch (error) {
        console.error("Error rendering Svelte component:", error);
      }
    };

    const title = document.querySelector("#title");

    if (title) {
      mountSearchBar(title);
    } else {
      await waitForElm("#title", true, 100, 60);
      mountSearchBar(document.querySelector("#title") as Element);
    }

    return () => {
      const searchButton = document.querySelector(".search-trigger");
      const searchRoot = document.querySelector(".global-search-root");
      if (searchButton) searchButton.remove();
      if (searchRoot) searchRoot.remove();

      // Clean up workers
      VectorWorkerManager.getInstance().terminate();
      unmount(app);
    };
  },
};

export default globalSearchPlugin;
