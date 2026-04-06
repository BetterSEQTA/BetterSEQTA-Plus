import { debounce } from "lodash";

/**
 * Automatically resizes the popup to fit the screen, checks on resize but is debounced to prevent intense utilisation.
 */
export class SettingsResizer {
  constructor() {
    this.adjustPopupHeight();
    window.addEventListener(
      "resize",
      debounce(this.adjustPopupHeight, 250) as EventListener,
    );
    document.addEventListener("DOMContentLoaded", this.adjustPopupHeight);
  }

  private adjustPopupHeight() {
    const iframePopup = document.getElementById("ExtensionPopup");
    if (!iframePopup) return;

    const viewportHeight = window.innerHeight;
    const rawIdeal = viewportHeight - 80 - 15; // room below top chrome
    const idealHeight = Math.min(Math.max(rawIdeal, 280), 600);

    iframePopup.style.height = `${idealHeight}px`;
  }
}
