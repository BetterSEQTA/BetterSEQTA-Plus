import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { convertTo12HourFormat } from "./convertTo12HourFormat";
import { waitForElm } from "./waitForElm";

let timetableObserver: MutationObserver | null = null;
let isOnTimetablePage = false;
let isInitialized = false;
let abortController: AbortController | null = null;

function updateTimeElements(): void {
  if (!settingsState.timeFormat || settingsState.timeFormat !== "12") return;

  const timetablePage = document.querySelector(".timetablepage");
  if (!timetablePage) return;

  const times = timetablePage.querySelectorAll<HTMLElement>(".content .times .time");
  times.forEach((el) => {
    if (!el.dataset.original) el.dataset.original = el.textContent || "";
    const original = el.dataset.original;
    if (!original) return;

    el.textContent = convertTo12HourFormat(original, true)
      .toLowerCase()
      .replace(" ", "");
  });

  const entryTimes = timetablePage.querySelectorAll<HTMLElement>(".entry .times");
  entryTimes.forEach((el) => {
    if (!el.dataset.original) el.dataset.original = el.textContent || "";
    const original = el.dataset.original || "";
    if (!original.includes("–") && !original.includes("-")) return;

    const [start, end] = original.split(/[-–]/).map((p) => p.trim());
    if (!start || !end) return;

    const start12 = convertTo12HourFormat(start).toLowerCase().replace(" ", "");
    const end12 = convertTo12HourFormat(end).toLowerCase().replace(" ", "");
    el.textContent = `${start12}–${end12}`;
  });

    const quickbarTimes = document.querySelectorAll<HTMLElement>(".quickbar .meta .times");
  quickbarTimes.forEach((el) => {
    if (!el.dataset.original) el.dataset.original = el.textContent || "";
    const original = el.dataset.original || "";

    if (!original.includes("–") && !original.includes("-")) return;
    const [start, end] = original.split(/[-–]/).map((p) => p.trim());
    
    if (!start || !end) return;
    const start12 = convertTo12HourFormat(start).toLowerCase().replace(" ", "");
    const end12 = convertTo12HourFormat(end).toLowerCase().replace(" ", "");
    el.textContent = `${start12}–${end12}`;
  });
}

function checkIfOnTimetablePage(): boolean {
  return window.location.hash.includes("page=/timetable");
}

function startTimetableMonitoring(): void {
  if (timetableObserver) return;

  const timetablePage = document.querySelector(".timetablepage");
  if (!timetablePage) return;

  // Create observer for timetable content changes
  timetableObserver = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        // Check if any time elements were added or modified
        const addedNodes = Array.from(mutation.addedNodes);
        const hasTimeElements = addedNodes.some(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            return element.querySelector(".time, .times") || 
                   element.classList.contains("time") || 
                   element.classList.contains("times");
          }
          return false;
        });
        
        if (hasTimeElements) {
          shouldUpdate = true;
        }
      }
    });

    if (shouldUpdate) {
      updateTimeElements();
    }
  });

  timetableObserver.observe(timetablePage, {
    childList: true,
    subtree: true,
  });
}

function stopTimetableMonitoring(): void {
  if (timetableObserver) {
    timetableObserver.disconnect();
    timetableObserver = null;
  }
}

function handleUrlChange(): void {
  const currentlyOnTimetable = checkIfOnTimetablePage();
  
  if (currentlyOnTimetable !== isOnTimetablePage) {
    isOnTimetablePage = currentlyOnTimetable;
    
    if (isOnTimetablePage) {
      // Wait a bit for the page to load, then start monitoring
      setTimeout(() => {
        updateTimeElements();
        startTimetableMonitoring();
      }, 100);
    } else {
      stopTimetableMonitoring();
    }
  } else if (isOnTimetablePage) {
    // Even if we're still on timetable page, update times in case navigation happened
    updateTimeElements();
  }
}

function startUrlMonitoring(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Create abort controller for cleanup
  abortController = new AbortController();
  const signal = abortController.signal;

  // Listen for hash changes (more efficient than polling)
  window.addEventListener('hashchange', handleUrlChange, { signal });
  window.addEventListener('popstate', handleUrlChange, { signal });
  
  // Initial check
  handleUrlChange();
}

function stopUrlMonitoring(): void {
  if (!isInitialized) return;
  isInitialized = false;

  // Abort all event listeners at once
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  
  stopTimetableMonitoring();
}

export async function updateTimetableTimes(): Promise<void> {
  if (!settingsState.timeFormat) return;

  const timetablePage = document.querySelector(".timetablepage");
  if (!timetablePage) return;

  // Wait for time elements to exist if page is still loading
  try {
    await waitForElm(".timetablepage .time", true, 10);
  } catch {
    return;
  }

  updateTimeElements();
  
  // Start continuous monitoring when this function is called
  isOnTimetablePage = checkIfOnTimetablePage();
  if (isOnTimetablePage) {
    startTimetableMonitoring();
    startUrlMonitoring();
  }
}

// Initialize monitoring on page load
if (typeof window !== "undefined") {
  // Start URL monitoring immediately
  startUrlMonitoring();
}

// Cleanup function for when the module is unloaded
export function cleanup(): void {
  stopUrlMonitoring();
}
