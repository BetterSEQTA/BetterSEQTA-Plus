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

  // Search trigger + progress UI live in one wrapper so the auto-margin
  // pushes the whole group to the left edge of the topbar instead of
  // stranding the progress text on the far right of the screen.
  const searchWrapper = document.createElement("div");
  searchWrapper.className = "search-trigger-wrapper";

  // Anchor lets us absolutely position the progress bar directly beneath
  // the search button without disturbing the topbar's vertical rhythm.
  const searchAnchor = document.createElement("div");
  searchAnchor.className = "search-trigger-anchor";

  const searchButton = document.createElement("div");
  searchButton.className = "search-trigger";

  const progressBarWrapper = document.createElement("div");
  progressBarWrapper.className = "search-progress-bar-wrapper";

  const progressBar = document.createElement("div");
  progressBar.className = "search-progress-bar";
  progressBarWrapper.appendChild(progressBar);

  // Use a block-level <div> so the label reliably participates in flex
  // layout. A <span> defaults to `display: inline`, which silently ignores
  // `max-width`, `overflow`, and `text-overflow: ellipsis`, and was the
  // reason the label appeared blank when the bar was visible.
  const progressText = document.createElement("div");
  progressText.className = "search-progress-text";
  progressText.setAttribute("aria-live", "polite");

  searchAnchor.appendChild(searchButton);
  searchAnchor.appendChild(progressBarWrapper);
  searchWrapper.appendChild(searchAnchor);
  searchWrapper.appendChild(progressText);

  // Indexing state
  let isIndexing = false;
  let completedJobs = 0;
  let totalJobs = 0;
  let indexingStatus: string | null = null;

  const updateProgressDisplay = () => {
    if (isIndexing && totalJobs > 0) {
      const percentage = Math.round((completedJobs / totalJobs) * 100);
      progressBar.style.width = `${Math.max(2, percentage)}%`;
      progressBarWrapper.classList.add("is-active");

      if (indexingStatus) {
        const statusText =
          indexingStatus.length > 28
            ? indexingStatus.substring(0, 28) + "…"
            : indexingStatus;
        progressText.textContent = `${statusText} · ${percentage}%`;
      } else {
        progressText.textContent = `Indexing ${completedJobs}/${totalJobs} (${percentage}%)`;
      }
      progressText.classList.add("is-active");
    } else {
      progressBarWrapper.classList.remove("is-active");
      progressText.classList.remove("is-active");
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
  titleElement.appendChild(searchWrapper);

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

  // Remove search trigger wrapper (which contains the button and progress UI)
  const searchWrapper = document.querySelector(".search-trigger-wrapper");
  if (searchWrapper) {
    searchWrapper.remove();
  }

  // Defensive cleanup for older mounts that may have left the trigger or
  // progress container as direct children of the topbar.
  document.querySelector(".search-trigger")?.remove();
  document.querySelector(".search-progress-container")?.remove();

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
