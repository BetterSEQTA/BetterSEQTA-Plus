import { settingsState } from "@/seqta/utils/listeners/SettingsState"; // Import user settings state
import type { Plugin } from "../../core/types"; // Import Plugin type definition
import { convertTo12HourFormat } from "@/seqta/utils/convertTo12HourFormat"; // Import utility to convert time to 12-hour format
import { waitForElm } from "@/seqta/utils/waitForElm"; // Import utility to wait for a DOM element to appear

// Define the timetable plugin object
const timetablePlugin: Plugin<{}, {}> = {
  id: "timetable", // Unique identifier for the plugin
  name: "Timetable Enhancer", // Display name for the plugin
  description: "Adds extra features to the timetable view", // Description shown to users
  version: "1.0.0", // Plugin version
  settings: {}, // Plugin settings (none defined)
  disableToggle: true, // Disables the toggle for this plugin in UI

  run: async (api) => {
    const { unregister } = api.seqta.onMount(".timetablepage", handleTimetable); // Register handler when timetable page mounts

    return () => {
      // Cleanup function on plugin unload
      unregister(); // Unregister mount handler

      const timetablePage = document.querySelector(".timetablepage"); // Select the timetable page
      if (timetablePage) {
        const zoomControls = document.querySelector(".timetable-zoom-controls"); // Select zoom controls
        if (zoomControls) zoomControls.remove(); // Remove zoom controls

        const hideControls = document.querySelector(".timetable-hide-controls"); // Select hide controls
        if (hideControls) hideControls.remove(); // Remove hide controls

        resetTimetableStyles(); // Reset modified timetable styles
      }
    };
  },
};

// Store zoom event handlers per DOM element for cleanup
const zoomHandlers = new WeakMap<
  Element,
  { zoomIn: () => void; zoomOut: () => void }
>();

// Reset timetable styles to their original layout
function resetTimetableStyles(): void {
  const firstDayColumn = document.querySelector(
    ".dailycal .content .days td",
  ) as HTMLElement;
  if (!firstDayColumn) return;

  const baseContainerHeight =
    parseInt(firstDayColumn.style.height) || firstDayColumn.offsetHeight;

  const dayColumns = document.querySelectorAll(".dailycal .content .days td");
  dayColumns.forEach((td: Element) => {
    (td as HTMLElement).style.height = `${baseContainerHeight}px`;
  });

  const timeColumn = document.querySelector(".times");
  if (timeColumn) {
    const times = timeColumn.querySelectorAll(".time");
    const timeHeight = baseContainerHeight / times.length;
    times.forEach((time: Element) => {
      (time as HTMLElement).style.height = `${timeHeight}px`;
    });
  }

  const lessons = document.querySelectorAll(".dailycal .lesson");
  lessons.forEach((lesson: Element) => {
    const lessonEl = lesson as HTMLElement;
    const originalHeight = lessonEl.getAttribute("data-original-height");
    if (originalHeight) {
      lessonEl.style.height = `${originalHeight}px`;
    }
  });

  const entries = document.querySelectorAll(".entry");
  entries.forEach((entry: Element) => {
    const entryEl = entry as HTMLElement;
    entryEl.style.opacity = "1"; // Reset entry opacity
  });

  const zoomControls = document.querySelector(".timetable-zoom-controls");
  if (zoomControls) {
    const handlers = zoomHandlers.get(zoomControls);
    if (handlers) {
      const zoomIn = zoomControls.querySelector(".timetable-zoom:nth-child(2)");
      const zoomOut = zoomControls.querySelector(
        ".timetable-zoom:nth-child(1)",
      );
      if (zoomIn) zoomIn.removeEventListener("click", handlers.zoomIn);
      if (zoomOut) zoomOut.removeEventListener("click", handlers.zoomOut);
      zoomHandlers.delete(zoomControls); // Clean up handler references
    }
  }
}

// Handle logic when the timetable page is mounted
async function handleTimetable(): Promise<void> {
  await waitForElm(".time", true, 10); // Wait for timetable time elements to appear

  // Save original height of each lesson for restoration later
  const lessons = document.querySelectorAll(".dailycal .lesson");
  lessons.forEach((lesson: Element) => {
    const lessonEl = lesson as HTMLElement;
    lessonEl.setAttribute(
      "data-original-height",
      lessonEl.offsetHeight.toString(),
    );
  });

  // Convert time to 12-hour format if setting is enabled
  if (settingsState.timeFormat == "12") {
    const times = document.querySelectorAll(".timetablepage .times .time");
    for (const time of times) {
      if (!time.textContent) continue;
      time.textContent = convertTo12HourFormat(time.textContent, true);
    }
  }

  handleTimetableZoom(); // Initialize zoom functionality
  handleTimetableAssessmentHide(); // Initialize hide control for assessments
}

// Initialize zoom feature for timetable view
function handleTimetableZoom(): void {
  console.log("Initializing timetable zoom controls");

  let timetableZoomLevel = 1; // Zoom level state
  let baseContainerHeight: number | null = null;
  const originalEntryPositions = new Map<
    Element,
    { topRatio: number; heightRatio: number }
  >();

  // Create container for zoom buttons
  const zoomControls = document.createElement("div");
  zoomControls.className = "timetable-zoom-controls";

  // Create zoom in button
  const zoomIn = document.createElement("button");
  zoomIn.className = "uiButton timetable-zoom iconFamily";
  zoomIn.innerHTML = "&#xed93;";

  // Create zoom out button
  const zoomOut = document.createElement("button");
  zoomOut.className = "uiButton timetable-zoom iconFamily";
  zoomOut.innerHTML = "&#xed94;";

  zoomControls.appendChild(zoomOut);
  zoomControls.appendChild(zoomIn);

  const toolbar = document.getElementById("toolbar");
  toolbar?.appendChild(zoomControls); // Add zoom controls to toolbar

  // Define zoom in event handler
  const zoomInHandler = () => {
    if (timetableZoomLevel < 2) {
      timetableZoomLevel += 0.2;
      updateZoom();
    }
  };

  // Define zoom out event handler
  const zoomOutHandler = () => {
    if (timetableZoomLevel > 0.6) {
      timetableZoomLevel -= 0.2;
      updateZoom();
    }
  };

  zoomIn.addEventListener("click", zoomInHandler);
  zoomOut.addEventListener("click", zoomOutHandler);

  // Store event handlers for cleanup
  zoomHandlers.set(zoomControls, {
    zoomIn: zoomInHandler,
    zoomOut: zoomOutHandler,
  });

  // Calculate and store original entry position ratios
  const initializePositions = () => {
    const firstDayColumn = document.querySelector(
      ".dailycal .content .days td",
    ) as HTMLElement;
    if (!firstDayColumn) return false;

    baseContainerHeight =
      parseInt(firstDayColumn.style.height) || firstDayColumn.offsetHeight;

    const entries = document.querySelectorAll(".entriesWrapper .entry");
    entries.forEach((entry: Element) => {
      const entryEl = entry as HTMLElement;
      if (baseContainerHeight === null) return;
      const topRatio = parseInt(entryEl.style.top) / baseContainerHeight;
      const heightRatio = parseInt(entryEl.style.height) / baseContainerHeight;

      originalEntryPositions.set(entry, { topRatio, heightRatio });
    });

    return true;
  };

  // Update layout based on zoom level
  const updateZoom = () => {
    if (baseContainerHeight === null && !initializePositions()) {
      console.error("Failed to initialize positions");
      return;
    }

    console.debug(`Updating zoom level to: ${timetableZoomLevel}`);

    if (baseContainerHeight === null) return;
    const newContainerHeight = baseContainerHeight * timetableZoomLevel;

    const dayColumns = document.querySelectorAll(".dailycal .content .days td");
    dayColumns.forEach((td: Element) => {
      (td as HTMLElement).style.height = `${newContainerHeight}px`;
    });

    const entries = document.querySelectorAll(".entriesWrapper .entry");
    entries.forEach((entry: Element) => {
      const entryEl = entry as HTMLElement;
      const originalRatios = originalEntryPositions.get(entry);

      if (originalRatios) {
        const newTop = originalRatios.topRatio * newContainerHeight;
        const newHeight = originalRatios.heightRatio * newContainerHeight;

        entryEl.style.top = `${Math.round(newTop)}px`;
        entryEl.style.height = `${Math.round(newHeight)}px`;
      }
    });

    const timeColumn = document.querySelector(".times");
    if (timeColumn) {
      const times = timeColumn.querySelectorAll(".time");
      const timeHeight = newContainerHeight / times.length;
      times.forEach((time: Element) => {
        (time as HTMLElement).style.height = `${timeHeight}px`;
      });
    }

    // Scroll middle entry into view after zoom
    entries[Math.round((entries.length - 1) / 2)].scrollIntoView({
      behavior: "instant",
      block: "center",
    });
  };
}

// Create UI to toggle visibility of non-assessment entries
function handleTimetableAssessmentHide(): void {
  const hideControls = document.createElement("div");
  hideControls.className = "timetable-hide-controls";

  const hideOn = document.createElement("button");
  hideOn.className = "uiButton timetable-hide iconFamily";
  hideOn.innerHTML = "&#128065;"; // Eye icon to represent visibility toggle

  hideControls.appendChild(hideOn);

  const toolbar = document.getElementById("toolbar");
  toolbar?.appendChild(hideControls); // Add hide button to toolbar

  // Toggle opacity of non-assessment entries
  function hideElements(): void {
    const entries = document.querySelectorAll(".entry");

    entries.forEach((entry: Element) => {
      const entryEl = entry as HTMLElement;
      if (!entryEl.classList.contains("assessment")) {
        entryEl.style.opacity = entryEl.style.opacity === "0.3" ? "1" : "0.3";
      }
    });
  }

  hideOn.addEventListener("click", hideElements); // Bind hide handler to button click
}

export default timetablePlugin; // Export the plugin for use
