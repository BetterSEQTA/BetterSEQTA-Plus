/**
 * Timetable colour save recovery (#221): broken menu.update.colours in PAGE context
 * (injected script) plus Coloris / overlay cleanup in the content script.
 */

import patchScript from "@/seqta/utils/seqtaMenuColourPatch.js?url";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
import { verboseInfo } from "@/utils/verboseLog";

const PAGE_PATCH_LOADER_ID = "bsplus-seqta-menu-colour-patch-loader";

export function dismissStaleModaliserContainers(): number {
  let removed = 0;
  for (const container of document.querySelectorAll(".modaliser-container")) {
    const modal = container.querySelector(".modaliser");
    if (!modal?.childElementCount || !container.classList.contains("visible")) {
      container.remove();
      removed++;
    }
  }
  return removed;
}

export function dismissStaleColourSlidePanes(
  forceColourChooser = false,
): number {
  let removed = 0;
  for (const pane of document.querySelectorAll(".uiSlidePane")) {
    if (pane.querySelector(".pane.colourChooser")) {
      pane.remove();
      removed++;
      continue;
    }
    if (!forceColourChooser && pane.classList.contains("shown")) continue;
    if (!pane.classList.contains("shown")) {
      pane.remove();
      removed++;
    }
  }
  return removed;
}

export function dismissStaleColourDialogs(forceColourChooser = false): {
  slideRemoved: number;
  modalRemoved: number;
} {
  const slideRemoved = dismissStaleColourSlidePanes(forceColourChooser);
  const modalRemoved = dismissStaleModaliserContainers();
  document.body.classList.remove("clr-open");
  document.documentElement.classList.remove("clr-open");
  return { slideRemoved, modalRemoved };
}

function setClrPickerState(reset: boolean): void {
  document.body.classList.remove("clr-open");
  document.documentElement.classList.remove("clr-open");
  for (const picker of document.querySelectorAll(".clr-picker")) {
    picker.classList.remove("clr-open");
    if (!(picker instanceof HTMLElement)) continue;
    if (reset) {
      picker.style.removeProperty("display");
      picker.style.removeProperty("pointer-events");
      picker.style.removeProperty("visibility");
    } else {
      picker.style.display = "none";
      picker.style.pointerEvents = "none";
      picker.style.visibility = "hidden";
    }
  }
}

/** Hide colour-picker / modal layers that intercept clicks after a colour save. */
export function dismissTimetableUiBlockers(): {
  slideRemoved: number;
  modalRemoved: number;
} {
  document.body.style.removeProperty("overflow");
  setClrPickerState(false);
  return dismissStaleColourDialogs();
}

/** Clear inline styles that can prevent Coloris from reopening. */
export function prepareColorisPickerOpen(): void {
  setClrPickerState(true);
}

let colorisRecoveryAttached = false;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export function attachTimetableColorisRecovery(): void {
  if (colorisRecoveryAttached) return;
  colorisRecoveryAttached = true;

  const scheduleDismiss = () => {
    if (dismissTimer !== null) clearTimeout(dismissTimer);
    dismissTimer = setTimeout(() => {
      dismissTimer = null;
      dismissTimetableUiBlockers();
    }, 100);
  };

  document.addEventListener("coloris:close", scheduleDismiss);
  document.addEventListener("coloris:pick", scheduleDismiss);

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".timetablepage")) return;

      if (target.closest("[title='Choose a colour']")) {
        if (dismissTimer !== null) {
          clearTimeout(dismissTimer);
          dismissTimer = null;
        }
        prepareColorisPickerOpen();
        return;
      }

      if (!target.closest(".entry")) return;

      const pickerOpen =
        document.body.classList.contains("clr-open") &&
        document.querySelector(".clr-picker.clr-open");
      if (!pickerOpen) {
        const result = dismissTimetableUiBlockers();
        if (result.slideRemoved > 0 || result.modalRemoved > 0) {
          verboseInfo(
            "[BetterSEQTA+] timetable colour: content-script cleanup",
            result,
          );
        }
      }
    },
    true,
  );
}

export function installSeqtaMenuColourPatch(): void {
  if (document.getElementById(PAGE_PATCH_LOADER_ID)) return;

  const script = document.createElement("script");
  script.id = PAGE_PATCH_LOADER_ID;
  script.src = resolveExtensionAssetUrl(patchScript);
  script.addEventListener("load", () => script.remove());
  (document.documentElement || document.head).appendChild(script);
}
