import renderSvelte from "@/interface/main";
import SearchBar from "../components/SearchBar.svelte";
import { unmount } from "svelte";
import { VectorWorkerManager } from "../indexing/worker/vectorWorkerManager";
import { formatHotkeyForDisplay, isValidHotkey } from "../utils/hotkeyUtils";
import browser from "webextension-polyfill";

export function mountSearchBar(
  titleElement: Element,
  api: any,
  appRef: { current: any; storageChangeHandler?: any },
) {
  if (titleElement.querySelector(".search-trigger")) {
    return;
  }

  // Fallback to default hotkey if the current one is invalid
  let currentHotkey = isValidHotkey(api.settings.searchHotkey) ? api.settings.searchHotkey : "ctrl+k";
  let hotkeyDisplay = formatHotkeyForDisplay(currentHotkey);

  const searchButton = document.createElement("div");
  searchButton.className = "search-trigger";
  
  const updateSearchButtonDisplay = () => {
    searchButton.innerHTML = /* html */ `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <p>Quick search...</p>
      <span style="margin-left: auto; display: flex; align-items: center; color: #777; font-size: 12px;">${hotkeyDisplay}</span>
    `;
  };

  updateSearchButtonDisplay();
  titleElement.appendChild(searchButton);

  // Listen for hotkey setting changes
  const handleStorageChange = (changes: any, area: string) => {
    if (area === 'local' && changes['plugin.global-search.settings']) {
      const newSettings = changes['plugin.global-search.settings'].newValue as { searchHotkey?: string } | undefined;
      if (newSettings?.searchHotkey && isValidHotkey(newSettings.searchHotkey)) {
        currentHotkey = newSettings.searchHotkey;
        hotkeyDisplay = formatHotkeyForDisplay(currentHotkey);
        updateSearchButtonDisplay();
      }
    }
  };

  browser.storage.onChanged.addListener(handleStorageChange);

  // Store reference to cleanup function for proper removal
  appRef.storageChangeHandler = handleStorageChange;

  const searchRoot = document.createElement("div");
  document.body.appendChild(searchRoot);
  const searchRootShadow = searchRoot.attachShadow({ mode: "open" });

  searchButton.addEventListener("click", () => {
    // @ts-ignore - Intentionally adding to window
    window.setCommandPalleteOpen(true);
  });

  try {
    appRef.current = renderSvelte(SearchBar, searchRootShadow, {
      transparencyEffects: api.settings.transparencyEffects ? true : false,
      showRecentFirst: api.settings.showRecentFirst,
      searchHotkey: currentHotkey,
    });
  } catch (error) {
    console.error("Error rendering Svelte component:", error);
  }
}

export function cleanupSearchBar(appRef: { current: any; storageChangeHandler?: any }) {
  if (appRef.current) {
    try {
      unmount(appRef.current);
      appRef.current = null;
    } catch (error) {
      console.error("Error unmounting Svelte component:", error);
    }
  }

  // Remove search trigger button
  const searchTrigger = document.querySelector(".search-trigger");
  if (searchTrigger) {
    searchTrigger.remove();
  }

  // Remove search root
  const searchRoot = document.querySelector("div[data-search-root]");
  if (searchRoot) {
    searchRoot.remove();
  }

  // Clean up vector worker
  VectorWorkerManager.getInstance().terminate();

  if (appRef.storageChangeHandler) {
    browser.storage.onChanged.removeListener(appRef.storageChangeHandler);
    appRef.storageChangeHandler = null;
  }
}
