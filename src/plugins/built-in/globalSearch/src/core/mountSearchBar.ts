import SearchBar from "../components/SearchBar.svelte";
import { unmount } from "svelte";
import { VectorWorkerManager } from "../indexing/worker/vectorWorkerManager";
import { formatHotkeyForDisplay, isValidHotkey } from "../utils/hotkeyUtils";
import browser from "webextension-polyfill";

export async function mountSearchBar(
  titleElement: Element,
  api: any,
  appRef: {
    current: any;
    storageChangeHandler?: any;
    progressHandler?: any;
    clearDoneFlashTimer?: () => void;
  },
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

  // Anchor stacks button + slim progress strip in one rounded chip (see
  // `.search-trigger-anchor` in styles.css).
  const searchAnchor = document.createElement("div");
  searchAnchor.className = "search-trigger-anchor";

  const searchButton = document.createElement("div");
  searchButton.className = "search-trigger";

  const searchIcon = document.createElement("span");
  searchIcon.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

  const searchLabel = document.createElement("p");
  searchLabel.textContent = "Quick search...";

  const hotkeySpan = document.createElement("span");
  hotkeySpan.className = "search-trigger-hotkey";
  hotkeySpan.style.marginLeft = "auto";
  hotkeySpan.style.display = "flex";
  hotkeySpan.style.alignItems = "center";
  hotkeySpan.style.color = "#777";
  hotkeySpan.style.fontSize = "12px";

  const progressBarWrapper = document.createElement("div");
  progressBarWrapper.className = "search-progress-bar-wrapper";

  const progressTrack = document.createElement("div");
  progressTrack.className = "search-progress-track";

  const progressBar = document.createElement("div");
  progressBar.className = "search-progress-bar";
  progressTrack.appendChild(progressBar);
  progressBarWrapper.appendChild(progressTrack);

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
  /** True while indexing has run until it finishes/fails — used for Done! flash only */
  let ranIndexingCycle = false;
  let completedJobs = 0;
  let totalJobs = 0;
  let indexingStatus: string | null = null;
  let doneFlashTimer: ReturnType<typeof setTimeout> | null = null;
  let doneFadeTimer: ReturnType<typeof setTimeout> | null = null;
  /** Captures `wasIndexing && !indexing` for the current dispatcher tick */
  let indexingJustStoppedFlag = false;

  const DONE_HOLD_MS = 5000;
  const DONE_FADE_MS = 550;

  /** Treat as failure copy — plain “Done!” would be misleading */
  const statusLooksRough = (s: string) =>
    /\b(fail|error|cancel)\b/i.test(s);

  const truncateStatus = (s: string, max = 44) =>
    s.length > max ? s.slice(0, max - 1) + "…" : s;

  const clearDoneFlashTimer = () => {
    if (doneFlashTimer) {
      clearTimeout(doneFlashTimer);
      doneFlashTimer = null;
    }
    if (doneFadeTimer) {
      clearTimeout(doneFadeTimer);
      doneFadeTimer = null;
    }
  };

  const resetIdleProgressUi = () => {
    clearDoneFlashTimer();
    progressBarWrapper.classList.remove("is-active", "is-rough-complete");
    searchAnchor.classList.remove("is-indexing");
    searchButton.classList.remove("is-indexing");
    progressText.classList.remove(
      "is-active",
      "is-rough",
      "is-fading-done",
      "is-done-message",
    );
    progressBar.style.width = "0%";
    progressText.textContent = "";
    ranIndexingCycle = false;
    indexingStatus = null;
  };

  const showActiveIndexingUi = (percentage: number) => {
    clearDoneFlashTimer();
    progressBarWrapper.classList.remove("is-rough-complete");
    progressText.classList.remove("is-rough", "is-fading-done", "is-done-message");
    progressBar.style.width = `${Math.max(2, percentage)}%`;
    progressBarWrapper.classList.add("is-active");
    searchAnchor.classList.add("is-indexing");
    searchButton.classList.add("is-indexing");
    progressText.textContent = indexingStatus
      ? `${truncateStatus(indexingStatus)} · ${percentage}%`
      : `Indexing ${completedJobs}/${totalJobs} (${percentage}%)`;
    progressText.classList.add("is-active");
  };

  const scheduleCompletionFlash = (rough: boolean) => {
    progressBar.style.width = "0%";
    progressBarWrapper.classList.remove("is-active");
    searchAnchor.classList.remove("is-indexing");
    searchButton.classList.remove("is-indexing");
    progressText.classList.remove("is-fading-done");
    progressText.textContent = rough ? truncateStatus(indexingStatus!, 52) : "Done!";
    progressText.classList.toggle("is-rough", rough);
    progressBarWrapper.classList.toggle("is-rough-complete", rough);
    progressText.classList.add("is-active", "is-done-message");

    doneFlashTimer = setTimeout(() => {
      doneFlashTimer = null;
      progressText.classList.add("is-fading-done");
      doneFadeTimer = setTimeout(() => {
        doneFadeTimer = null;
        resetIdleProgressUi();
      }, DONE_FADE_MS);
    }, DONE_HOLD_MS);
  };

  const updateProgressDisplay = () => {
    const indexingStoppedThisTick = indexingJustStoppedFlag;
    indexingJustStoppedFlag = false;

    const active = isIndexing && totalJobs > 0;

    // Stray pulses (missing total, 0 completed, etc.) used to hit the idle
    // branch and call clearDoneFlashTimer(), killing the Done! hold/fade.
    if (doneFlashTimer !== null || doneFadeTimer !== null) {
      if (!active) return;
      clearDoneFlashTimer();
    }

    const completionEligible =
      ranIndexingCycle &&
      !active &&
      totalJobs > 0 &&
      (completedJobs >= totalJobs || indexingStoppedThisTick);

    if (active) {
      showActiveIndexingUi(Math.round((completedJobs / totalJobs) * 100));
      return;
    }

    if (completionEligible) {
      if (doneFlashTimer !== null || doneFadeTimer !== null) return;
      const rough = indexingStatus != null && statusLooksRough(indexingStatus);
      scheduleCompletionFlash(rough);
      return;
    }

    resetIdleProgressUi();
  };

  // Listen for indexing progress events
  const progressHandler = (event: CustomEvent) => {
    const { completed, total, indexing, status } = event.detail as {
      completed?: number;
      total?: number;
      indexing?: boolean;
      status?: string;
    };
    const wasIndexing = isIndexing;

    completedJobs = completed ?? 0;
    totalJobs = total ?? 0;
    isIndexing = Boolean(indexing);
    indexingStatus = status ?? null;
    indexingJustStoppedFlag = wasIndexing && !isIndexing;

    if (!wasIndexing && isIndexing) ranIndexingCycle = true;
    if (wasIndexing && !isIndexing) ranIndexingCycle = true;
    if (totalJobs > 0 && completedJobs >= totalJobs && !isIndexing) {
      ranIndexingCycle = true;
    }

    updateProgressDisplay();
  };

  window.addEventListener('indexing-progress', progressHandler as EventListener);
  appRef.progressHandler = progressHandler;
  appRef.clearDoneFlashTimer = clearDoneFlashTimer;
  
  const updateSearchButtonDisplay = () => {
    hotkeySpan.textContent = hotkeyDisplay;
    searchButton.replaceChildren(searchIcon, searchLabel, hotkeySpan);
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
    const { default: renderSvelte } = await import("@/interface/renderInShadow");
    appRef.current = renderSvelte(SearchBar, searchRootShadow, {
      transparencyEffects: api.settings.transparencyEffects,
      showRecentFirst: api.settings.showRecentFirst,
      searchHotkey: currentHotkey,
    });
  } catch (error) {
    console.error("Error rendering Svelte component:", error);
  }
}

export function cleanupSearchBar(appRef: {
  current: any;
  storageChangeHandler?: any;
  progressHandler?: any;
  clearDoneFlashTimer?: () => void;
}) {
  if (appRef.current) {
    try {
      unmount(appRef.current);
      appRef.current = null;
    } catch (error) {
      console.error("Error unmounting Svelte component:", error);
    }
  }

  try {
    appRef.clearDoneFlashTimer?.();
  } catch {
    /* ignore */
  }
  appRef.clearDoneFlashTimer = undefined;

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
