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
  if (!useCssPopupAnimation()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      background.removeEventListener("transitionend", onEnd);
      resolve();
    };

    const onEnd = (event: TransitionEvent) => {
      if (event.target !== background || event.propertyName !== "opacity") return;
      finish();
    };

    background.addEventListener("transitionend", onEnd);
    background.classList.remove(OPEN_CLASS);
    window.setTimeout(finish, CLOSE_FALLBACK_MS);
  });
}
