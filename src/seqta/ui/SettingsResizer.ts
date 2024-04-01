import { debounce } from "lodash";

/**
 * Automatically resizes the popup to fit the screen, checks on resize but is debounced to prevent intense utilisation.
 */
export class SettingsResizer {
  constructor() {
    this.adjustPopupHeight();
    window.addEventListener('resize', debounce(this.adjustPopupHeight, 250) as EventListener);
    document.addEventListener('DOMContentLoaded', this.adjustPopupHeight);
  }

  private adjustPopupHeight() {
    const iframePopup = document.getElementById('ExtensionPopup');
    if (!iframePopup) return;

    const viewportHeight = window.innerHeight;
    const idealHeight = viewportHeight - 80 - 15; // -80px for the top of the popup

    if (idealHeight > 600) {
      iframePopup.style.height = '600px';
    } else {
      iframePopup.style.height = `${idealHeight}px`;
    }
  }
}