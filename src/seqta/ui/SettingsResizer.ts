import debounce from "@/seqta/utils/debounce";

/**
 * Keeps the settings overlay covering the viewport.
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

    iframePopup.style.inset = "0";
    iframePopup.style.top = "0";
    iframePopup.style.right = "0";
    iframePopup.style.width = "100%";
    iframePopup.style.height = "100%";
  }
}
