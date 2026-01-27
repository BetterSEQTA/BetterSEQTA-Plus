import renderSvelte from "@/interface/main";
import SearchBar from "../components/SearchBar.svelte";
import { unmount } from "svelte";
import { VectorWorkerManager } from "../indexing/worker/vectorWorkerManager";
import { formatHotkeyForDisplay, isValidHotkey } from "../utils/hotkeyUtils";
import browser from "webextension-polyfill";

export function mountSearchBar(
  titleElement: Element,
  api: any,
  appRef: { current: any; storageChangeHandler?: any; progressHandler?: any },
) {
  if (titleElement.querySelector(".search-trigger")) {
    return;
  }

  // Fallback to default hotkey if the current one is invalid
  let currentHotkey = isValidHotkey(api.settings.searchHotkey) ? api.settings.searchHotkey : "ctrl+k";
  let hotkeyDisplay = formatHotkeyForDisplay(currentHotkey);

  const searchButton = document.createElement("div");
  searchButton.className = "search-trigger";
  
  // Create progress indicator container
  const progressContainer = document.createElement("div");
  progressContainer.className = "search-progress-container";
  progressContainer.style.cssText = "display: flex; align-items: center; gap: 8px; margin-left: 8px; min-width: 120px;";
  
  // Create progress bar
  const progressBarWrapper = document.createElement("div");
  progressBarWrapper.className = "search-progress-bar-wrapper";
  progressBarWrapper.style.cssText = "flex: 1; height: 4px; background: rgba(0, 0, 0, 0.1); border-radius: 2px; overflow: hidden; display: none;";
  
  const progressBar = document.createElement("div");
  progressBar.className = "search-progress-bar";
  progressBar.style.cssText = "height: 100%; background: linear-gradient(90deg, #3b82f6, #2563eb, #3b82f6); transition: width 0.3s ease-out; width: 0%; position: relative;";
  
  // Add shimmer effect
  const shimmer = document.createElement("div");
  shimmer.style.cssText = "position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); animation: shimmer 2s infinite;";
  progressBar.appendChild(shimmer);
  progressBarWrapper.appendChild(progressBar);
  
  // Create progress text
  const progressText = document.createElement("span");
  progressText.className = "search-progress-text";
  progressText.style.cssText = "font-size: 11px; color: #666; white-space: nowrap; display: none;";
  
  progressContainer.appendChild(progressBarWrapper);
  progressContainer.appendChild(progressText);
  
  // Indexing state
  let isIndexing = false;
  let completedJobs = 0;
  let totalJobs = 0;
  let indexingStatus: string | null = null;
  
  const updateProgressDisplay = () => {
    if (isIndexing && totalJobs > 0) {
      const percentage = Math.round((completedJobs / totalJobs) * 100);
      progressBar.style.width = `${Math.max(2, percentage)}%`;
      progressBarWrapper.style.display = "block";
      
      if (indexingStatus) {
        progressText.textContent = indexingStatus.length > 20 ? indexingStatus.substring(0, 20) + "..." : indexingStatus;
        progressText.style.display = "block";
      } else {
        progressText.textContent = `${completedJobs}/${totalJobs} (${percentage}%)`;
        progressText.style.display = "block";
      }
    } else {
      progressBarWrapper.style.display = "none";
      progressText.style.display = "none";
    }
  };
  
  // Listen for indexing progress events
  const progressHandler = (event: CustomEvent) => {
    const { completed, total, indexing, status } = event.detail;
    completedJobs = completed || 0;
    totalJobs = total || 0;
    isIndexing = indexing || false;
    indexingStatus = status || null;
    updateProgressDisplay();
  };
  
  window.addEventListener('indexing-progress', progressHandler as EventListener);
  appRef.progressHandler = progressHandler;
  
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
  titleElement.appendChild(progressContainer);

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

export function cleanupSearchBar(appRef: { current: any; storageChangeHandler?: any; progressHandler?: any }) {
  if (appRef.current) {
    try {
      unmount(appRef.current);
      appRef.current = null;
    } catch (error) {
      console.error("Error unmounting Svelte component:", error);
    }
  }

  // Remove progress event listener
  if (appRef.progressHandler) {
    window.removeEventListener('indexing-progress', appRef.progressHandler as EventListener);
    appRef.progressHandler = null;
  }

  // Remove search trigger button
  const searchTrigger = document.querySelector(".search-trigger");
  if (searchTrigger) {
    searchTrigger.remove();
  }
  
  // Remove progress container
  const progressContainer = document.querySelector(".search-progress-container");
  if (progressContainer) {
    progressContainer.remove();
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
