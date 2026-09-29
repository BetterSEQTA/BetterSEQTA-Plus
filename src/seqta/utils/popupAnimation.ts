import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { fullMotionEffectsEnabled } from "@/seqta/utils/performanceMode";

const BACKDROP_CLASS = "bsplus-popup-css-animate";
const OPEN_CLASS = "bsplus-popup-css-animate--open";
const LITE_BACKDROP_CLASS = "bsplus-popup-backdrop--lite";

const CLOSE_FALLBACK_MS = 240;

/** CSS fade/scale path — used when animations are on but Motion springs are off (performance mode). */
export function useCssPopupAnimation(): boolean {
  return settingsState.animations !== false && !fullMotionEffectsEnabled();
}

export function preparePopupCssAnimation(background: HTMLElement): void {
  background.classList.add(BACKDROP_CLASS, LITE_BACKDROP_CLASS);
}

export function animatePopupOpen(background: HTMLElement): void {
  if (!useCssPopupAnimation()) return;

  preparePopupCssAnimation(background);
  background.classList.remove(OPEN_CLASS);

  requestAnimationFrame(() => {
    void background.offsetWidth;
    background.classList.add(OPEN_CLASS);
  });
}

export function animatePopupClose(background: HTMLElement): Promise<void> {
  if (!useCssPopupAnimation()) return Promise.resolve();
  background.classList.remove(OPEN_CLASS);
  return new Promise((resolve) => window.setTimeout(resolve, CLOSE_FALLBACK_MS));
}
