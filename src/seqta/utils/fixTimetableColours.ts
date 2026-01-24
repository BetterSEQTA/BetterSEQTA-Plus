import { waitForElm } from "./waitForElm";

let timetableObserver: MutationObserver | null = null;
let isOnTimetablePage = false;
let isInitialized = false;
let abortController: AbortController | null = null;

let lastSnapshot: String = "";

function checkIfOnTimetablePage(): boolean {
  return window.location.hash.includes("page=/timetable");
}

function startTimetableMonitoring(): void {
  if (timetableObserver) return;

  const timetablePage = document.querySelector(".timetablepage");
  if (!timetablePage) return;

  lastSnapshot = Array.from(
    timetablePage.querySelectorAll("*"),
    (el) => getComputedStyle(el).color,
  ).join("|");

  // Create observer for timetable content changes
  timetableObserver = new MutationObserver((mutations) => {
    const snapshot = Array.from(
      timetablePage.querySelectorAll("*"),
      (el) => getComputedStyle(el).color,
    ).join("|");

    if (snapshot !== lastSnapshot) {
      // implement colour fix code here
      lastSnapshot = snapshot;
    }
  });

  timetableObserver.observe(timetablePage, {
    childList: true,
    subtree: true,
  });
}

function handleUrlChange(): void {
  const currentlyOnTimetable = checkIfOnTimetablePage();

  if (currentlyOnTimetable !== isOnTimetablePage) {
    isOnTimetablePage = currentlyOnTimetable;

    if (isOnTimetablePage) {
      // Wait a bit for the page to load, then start monitoring
      setTimeout(() => {
        startTimetableMonitoring();
      }, 100);
    } else {
      stopTimetableMonitoring();
    }
  } else if (isOnTimetablePage) {
  }
}

function startUrlMonitoring(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Create abort controller for cleanup
  abortController = new AbortController();
  const signal = abortController.signal;

  // Listen for hash changes (more efficient than polling)
  window.addEventListener("hashchange", handleUrlChange, { signal });
  window.addEventListener("popstate", handleUrlChange, { signal });

  // Initial check
  handleUrlChange();
}

function stopTimetableMonitoring(): void {
  if (timetableObserver) {
    timetableObserver.disconnect();
    timetableObserver = null;
  }
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

// Initialize monitoring on page load
if (typeof window !== "undefined") {
  // Start URL monitoring immediately
  startUrlMonitoring();
}

export async function fixTimetableColours(): Promise<void> {
  const timetablePage = document.querySelector(".timetablepage");
  if (!timetablePage) return;

  // Wait for time elements to exist if page is still loading
  try {
    await waitForElm(".timetablepage .time", true, 10);
  } catch {
    return;
  }

  // Start continuous monitoring when this function is called
  isOnTimetablePage = checkIfOnTimetablePage();
  if (isOnTimetablePage) {
    startTimetableMonitoring();
    startUrlMonitoring();
  }
}

// Cleanup function for when the module is unloaded
export function cleanup(): void {
  stopUrlMonitoring();
}
