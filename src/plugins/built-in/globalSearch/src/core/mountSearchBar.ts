import SearchBar from "../components/SearchBar.svelte";
import { unmount } from "svelte";
import { warmUpVectorSearchOnInteraction } from "../search/vector/vectorSearch";
import { formatHotkeyForDisplay, isValidHotkey } from "../utils/hotkeyUtils";
import { waitForElm } from "@/seqta/utils/waitForElm";
import browser from "webextension-polyfill";

type AppRef = {
  current: any;
  storageChangeHandler?: any;
  progressHandler?: any;
  clearDoneFlashTimer?: () => void;
  clickHandler?: () => void;
  ownedTrigger?: boolean;
};

const SEARCH_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

async function resolveTriggerWrapper(
  titleElement: Element,
): Promise<HTMLElement | null> {
  const existing = titleElement.querySelector(
    ".search-trigger-wrapper",
  ) as HTMLElement | null;
  if (existing) return existing;

  const custom =
    titleElement.classList.contains("bsplus-custom-title") ||
    document.documentElement.classList.contains("bsplus-custom-title-pending") ||
    document.getElementById("bsplus-title-root");
  if (!custom) return null;

  try {
    return (await waitForElm(
      "#bsplus-title-root .search-trigger-wrapper",
      true,
      50,
      80,
    )) as HTMLElement;
  } catch {
    return null;
  }
}

function buildTriggerWrapper() {
  const searchWrapper = document.createElement("div");
  searchWrapper.className = "search-trigger-wrapper";
  searchWrapper.innerHTML = `
    <div class="search-trigger-anchor">
      <div class="search-trigger">
        <span>${SEARCH_SVG}</span>
        <p>Quick search...</p>
        <span class="search-trigger-hotkey" style="margin-left:auto;display:flex;align-items:center;color:#777;font-size:12px"></span>
      </div>
      <div class="search-progress-bar-wrapper">
        <div class="search-progress-track">
          <div class="search-progress-bar" style="width:0%"></div>
        </div>
      </div>
    </div>
    <div class="search-progress-text" aria-live="polite"></div>`;
  return searchWrapper;
}

function triggerParts(searchWrapper: HTMLElement) {
  const q = <T extends HTMLElement>(sel: string) =>
    searchWrapper.querySelector(sel) as T;
  return {
    searchWrapper,
    searchAnchor: q(".search-trigger-anchor"),
    searchButton: q(".search-trigger"),
    searchIcon: q(".search-trigger > span"),
    searchLabel: q(".search-trigger > p"),
    hotkeySpan: q(".search-trigger-hotkey"),
    progressBarWrapper: q(".search-progress-bar-wrapper"),
    progressBar: q(".search-progress-bar"),
    progressText: q(".search-progress-text"),
  };
}

export async function mountSearchBar(
  titleElement: Element,
  api: any,
  appRef: AppRef,
) {
  const preRendered = await resolveTriggerWrapper(titleElement);
  if (preRendered?.dataset.bsplusSearchWired === "1") return;

  let currentHotkey = isValidHotkey(api.settings.searchHotkey)
    ? api.settings.searchHotkey
    : "ctrl+k";
  let hotkeyDisplay = formatHotkeyForDisplay(currentHotkey);

  const ownedTrigger = !preRendered;
  appRef.ownedTrigger = ownedTrigger;

  const {
    searchWrapper,
    searchAnchor,
    searchButton,
    searchIcon,
    searchLabel,
    hotkeySpan,
    progressBarWrapper,
    progressBar,
    progressText,
  } = triggerParts(preRendered ?? buildTriggerWrapper());

  if (
    !searchAnchor ||
    !searchButton ||
    !hotkeySpan ||
    !progressBarWrapper ||
    !progressBar ||
    !progressText
  ) {
    console.error("[Global Search] Search trigger markup incomplete");
    return;
  }

  let isIndexing = false;
  let ranIndexingCycle = false;
  let completedJobs = 0;
  let totalJobs = 0;
  let indexingStatus: string | null = null;
  let doneFlashTimer: ReturnType<typeof setTimeout> | null = null;
  let doneFadeTimer: ReturnType<typeof setTimeout> | null = null;
  let indexingJustStoppedFlag = false;

  const DONE_HOLD_MS = 5000;
  const DONE_FADE_MS = 550;
  const statusLooksRough = (s: string) => /\b(fail|error|cancel)\b/i.test(s);
  const truncateStatus = (s: string, max = 44) =>
    s.length > max ? s.slice(0, max - 1) + "…" : s;

  const clearDoneFlashTimer = () => {
    if (doneFlashTimer) clearTimeout(doneFlashTimer);
    if (doneFadeTimer) clearTimeout(doneFadeTimer);
    doneFlashTimer = null;
    doneFadeTimer = null;
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
    progressText.textContent = rough
      ? truncateStatus(indexingStatus!, 52)
      : "Done!";
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

    if (doneFlashTimer !== null || doneFadeTimer !== null) {
      if (!active) return;
      clearDoneFlashTimer();
    }

    if (active) {
      showActiveIndexingUi(Math.round((completedJobs / totalJobs) * 100));
      return;
    }

    const completionEligible =
      ranIndexingCycle &&
      !active &&
      totalJobs > 0 &&
      (completedJobs >= totalJobs || indexingStoppedThisTick);

    if (completionEligible) {
      if (doneFlashTimer !== null || doneFadeTimer !== null) return;
      scheduleCompletionFlash(
        indexingStatus != null && statusLooksRough(indexingStatus),
      );
      return;
    }

    resetIdleProgressUi();
  };

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

  window.addEventListener("indexing-progress", progressHandler as EventListener);
  appRef.progressHandler = progressHandler;
  appRef.clearDoneFlashTimer = clearDoneFlashTimer;

  const updateSearchButtonDisplay = () => {
    hotkeySpan.textContent = hotkeyDisplay;
    searchButton.replaceChildren(searchIcon, searchLabel, hotkeySpan);
  };
  updateSearchButtonDisplay();

  if (ownedTrigger) {
    const customRoot = document.getElementById("bsplus-title-root");
    (customRoot ?? titleElement).appendChild(searchWrapper);
  }
  searchWrapper.dataset.bsplusSearchWired = "1";

  const handleStorageChange = (changes: any, area: string) => {
    if (area !== "local" || !changes["plugin.global-search.settings"]) return;
    const next = changes["plugin.global-search.settings"].newValue as
      | { searchHotkey?: string }
      | undefined;
    if (!next?.searchHotkey || !isValidHotkey(next.searchHotkey)) return;
    currentHotkey = next.searchHotkey;
    hotkeyDisplay = formatHotkeyForDisplay(currentHotkey);
    updateSearchButtonDisplay();
  };
  browser.storage.onChanged.addListener(handleStorageChange);
  appRef.storageChangeHandler = handleStorageChange;

  const searchRoot = document.createElement("div");
  searchRoot.setAttribute("data-search-root", "");
  document.body.appendChild(searchRoot);

  const clickHandler = () => {
    warmUpVectorSearchOnInteraction();
    // @ts-ignore
    window.setCommandPalleteOpen(true);
  };
  searchButton.addEventListener("click", clickHandler);
  appRef.clickHandler = clickHandler;

  try {
    const { default: renderSvelte } = await import("@/interface/main");
    appRef.current = renderSvelte(
      SearchBar,
      searchRoot.attachShadow({ mode: "open" }),
      {
        transparencyEffects: api.settings.transparencyEffects,
        showRecentFirst: api.settings.showRecentFirst,
        searchHotkey: currentHotkey,
      },
      "content",
    );
  } catch (error) {
    console.error("Error rendering Svelte component:", error);
  }
}

export function cleanupSearchBar(appRef: AppRef) {
  if (appRef.current) {
    try {
      unmount(appRef.current);
    } catch (error) {
      console.error("Error unmounting Svelte component:", error);
    }
    appRef.current = null;
  }

  try {
    appRef.clearDoneFlashTimer?.();
  } catch {
    /* ignore */
  }
  appRef.clearDoneFlashTimer = undefined;

  if (appRef.progressHandler) {
    window.removeEventListener(
      "indexing-progress",
      appRef.progressHandler as EventListener,
    );
    appRef.progressHandler = null;
  }

  const searchWrapper = document.querySelector(
    ".search-trigger-wrapper",
  ) as HTMLElement | null;
  const customOwns = Boolean(
    document.querySelector("#title.bsplus-custom-title") ||
      document.getElementById("bsplus-title-root"),
  );

  if (searchWrapper) {
    const btn = searchWrapper.querySelector(".search-trigger");
    if (btn && appRef.clickHandler) {
      btn.removeEventListener("click", appRef.clickHandler);
    }
    appRef.clickHandler = undefined;

    if (customOwns || appRef.ownedTrigger === false) {
      delete searchWrapper.dataset.bsplusSearchWired;
    } else {
      searchWrapper.remove();
    }
  }

  document.querySelector("div[data-search-root]")?.remove();

  void import("../indexing/worker/vectorWorkerManager")
    .then(({ VectorWorkerManager }) => {
      VectorWorkerManager.getInstance().terminate();
    })
    .catch(() => {});

  if (appRef.storageChangeHandler) {
    browser.storage.onChanged.removeListener(appRef.storageChangeHandler);
    appRef.storageChangeHandler = null;
  }
  appRef.ownedTrigger = undefined;
}
