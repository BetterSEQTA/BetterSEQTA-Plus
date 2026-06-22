/**
 * SEQTA timetable colour picker (Coloris) recovery and click-blocker cleanup.
 * Subject colour saves trigger SEQTA's broken menu.update.colours handler — see
 * patchSeqtaMenuUpdateColours.ts.
 */

import { dismissStaleColourDialogs } from "@/seqta/utils/patchSeqtaMenuUpdateColours";
import { verboseInfo } from "@/utils/verboseLog";

let attached = false;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

const DISMISS_DELAY_MS = 100;

function scheduleDismiss(): void {
  if (dismissTimer !== null) clearTimeout(dismissTimer);
  dismissTimer = setTimeout(() => {
    dismissTimer = null;
    dismissTimetableUiBlockers();
  }, DISMISS_DELAY_MS);
}

/** Hide colour-picker / modal layers that intercept clicks after a colour save. */
export function dismissTimetableUiBlockers(): {
  slideRemoved: number;
  modalRemoved: number;
} {
  document.body.style.removeProperty("overflow");

  for (const picker of document.querySelectorAll(".clr-picker")) {
    picker.classList.remove("clr-open");
    if (picker instanceof HTMLElement) {
      picker.style.display = "none";
      picker.style.pointerEvents = "none";
      picker.style.visibility = "hidden";
    }
  }

  return dismissStaleColourDialogs();
}

/** Clear inline styles that can prevent Coloris from reopening. */
export function prepareColorisPickerOpen(): void {
  document.body.classList.remove("clr-open");
  document.documentElement.classList.remove("clr-open");

  for (const picker of document.querySelectorAll(".clr-picker")) {
    picker.classList.remove("clr-open");
    if (picker instanceof HTMLElement) {
      picker.style.removeProperty("display");
      picker.style.removeProperty("pointer-events");
      picker.style.removeProperty("visibility");
    }
  }
}

export function attachTimetableColorisRecovery(): void {
  if (attached) return;
  attached = true;

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
