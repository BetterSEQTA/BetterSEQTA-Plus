/**
 * SEQTA Learn bug (vanilla too): MainMenu.updateColours uses
 * `.each(function (item) { this.options... }).bind(this)` — the bind is on
 * `.each()`'s return value, not the callback. Saving a timetable subject colour
 * sends `menu.update.colours` and throws.
 *
 * Also: ColourChooser (SlidePane + Modaliser) can leave a full-screen
 * uiSlidePane / empty modaliser-container that blocks timetable clicks.
 *
 * Must run in the PAGE JavaScript context — inject via web_accessible script URL.
 */

import browser from "webextension-polyfill";
import patchScript from "@/seqta/utils/seqtaMenuColourPatch.js?url";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";

const PAGE_PATCH_LOADER_ID = "bsplus-seqta-menu-colour-patch-loader";

/** Remove empty or hidden modaliser shells left after colour dialog teardown. */
export function dismissStaleModaliserContainers(): number {
  let removed = 0;
  for (const container of document.querySelectorAll(".modaliser-container")) {
    const modal = container.querySelector(".modaliser");
    const empty = !modal || modal.childElementCount === 0;
    const hidden = !container.classList.contains("visible");
    if (empty || hidden) {
      container.remove();
      removed++;
    }
  }
  return removed;
}

/** Remove stuck SEQTA colour chooser slide panes that intercept timetable clicks. */
export function dismissStaleColourSlidePanes(
  forceColourChooser = false,
): number {
  let removed = 0;
  for (const pane of document.querySelectorAll(".uiSlidePane")) {
    const isColourChooser = pane.querySelector(".pane.colourChooser");
    if (isColourChooser) {
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

export function installSeqtaMenuColourPatch(): void {
  if (document.getElementById(PAGE_PATCH_LOADER_ID)) return;

  const script = document.createElement("script");
  script.id = PAGE_PATCH_LOADER_ID;
  script.src = resolveExtensionAssetUrl(patchScript);
  script.addEventListener("load", () => script.remove());
  (document.documentElement || document.head).appendChild(script);
}
