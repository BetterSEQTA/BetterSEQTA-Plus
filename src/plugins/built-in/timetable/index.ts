import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import type { Plugin } from "../../core/types";
import { convertTo12HourFormat } from "@/seqta/utils/convertTo12HourFormat";
import { waitForElm } from "@/seqta/utils/waitForElm";

const timetablePlugin: Plugin<{}, {}> = {
  id: "timetable",
  name: "Timetable Enhancer",
  description: "Adds extra features to the timetable view",
  version: "1.0.0",
  settings: {},
  disableToggle: true,

  run: async (api) => {
    const { unregister } = api.seqta.onMount(".timetablepage", handleTimetable);

    return () => {
      // Call the unregister function to remove the mount listener
      unregister();

      const timetablePage = document.querySelector(".timetablepage");
      if (timetablePage) {
        const zoomControls = document.querySelector(".timetable-zoom-controls");
        if (zoomControls) zoomControls.remove();

        const hideControls = document.querySelector(".timetable-hide-controls");
        if (hideControls) hideControls.remove();

        resetTimetableStyles();
      }
    };
  },
};

// Store event handlers globally for cleanup
const zoomHandlers = new WeakMap<
  Element,
  { zoomIn: () => void; zoomOut: () => void }
>();

function resetTimetableStyles(): void {
  // Reset entry opacity (for assessment hide feature)
  const entries = document.querySelectorAll(".entry");
  entries.forEach((entry: Element) => {
    const entryEl = entry as HTMLElement;
    entryEl.style.opacity = "1";
  });

  // Clean up zoom control event handlers
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
      zoomHandlers.delete(zoomControls);
    }
  }
}

async function handleTimetable(): Promise<void> {
  await waitForElm(".time", true, 10);

  // Convert time format if needed
  if (settingsState.timeFormat == "12") {
    const times = document.querySelectorAll(".timetablepage .times .time, .timetablepage .entry.new");
    for (const time of times) {
      if (!time.textContent) continue;
      time.textContent = convertTo12HourFormat(time.textContent, true);
    }
  }

  handleTimetableZoom();
  handleTimetableAssessmentHide();
}

function handleTimetableZoom(): void {
  console.log("Initializing timetable zoom controls");

  // Create zoom controls
  const zoomControls = document.createElement("div");
  zoomControls.className = "timetable-zoom-controls";

  const zoomIn = document.createElement("button");
  zoomIn.className = "uiButton timetable-zoom iconFamily";
  zoomIn.innerHTML = "&#xed93;"; // Unicode for zoom in icon (custom iconfamily)

  const zoomOut = document.createElement("button");
  zoomOut.className = "uiButton timetable-zoom iconFamily";
  zoomOut.innerHTML = "&#xed94;"; // Unicode for zoom out icon (custom iconfamily)

  zoomControls.appendChild(zoomOut);
  zoomControls.appendChild(zoomIn);

  const toolbar = document.getElementById("toolbar");
  toolbar?.appendChild(zoomControls);

  // Store event listener references
  const zoomInHandler = () => {
    const seqtaZoomIn = document.querySelector('.uiButton.zoom.in') as HTMLElement;
    if (seqtaZoomIn) {
      seqtaZoomIn.click();
    }
  };

  const zoomOutHandler = () => {
    const seqtaZoomOut = document.querySelector('.uiButton.zoom.out') as HTMLElement;
    if (seqtaZoomOut) {
      seqtaZoomOut.click();
    }
  };

  zoomIn.addEventListener("click", zoomInHandler);
  zoomOut.addEventListener("click", zoomOutHandler);

  // Store references for cleanup
  zoomHandlers.set(zoomControls, {
    zoomIn: zoomInHandler,
    zoomOut: zoomOutHandler,
  });
}

function handleTimetableAssessmentHide(): void {
  const hideControls = document.createElement("div");
  hideControls.className = "timetable-hide-controls";

  const hideOn = document.createElement("button");
  hideOn.className = "uiButton timetable-hide iconFamily";
  hideOn.innerHTML = "&#128065;";

  hideControls.appendChild(hideOn);

  const toolbar = document.getElementById("toolbar");
  toolbar?.appendChild(hideControls);

  function hideElements(): void {
    const entries = document.querySelectorAll(".entry");

    entries.forEach((entry: Element) => {
      const entryEl = entry as HTMLElement;
      if (!entryEl.classList.contains("assessment")) {
        entryEl.style.opacity = entryEl.style.opacity === "0.3" ? "1" : "0.3";
      }
    });
  }

  hideOn.addEventListener("click", hideElements);
}

export default timetablePlugin;
