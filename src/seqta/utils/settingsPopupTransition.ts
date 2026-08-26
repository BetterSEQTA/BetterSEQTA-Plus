import type { AnimationPlaybackControls } from "motion";

let popupTransitionGeneration = 0;
let activePopupAnimations: AnimationPlaybackControls[] = [];

export function beginSettingsPopupTransition(): number {
  popupTransitionGeneration += 1;
  stopSettingsPopupAnimations();
  return popupTransitionGeneration;
}

export function isCurrentSettingsPopupTransition(generation: number): boolean {
  return generation === popupTransitionGeneration;
}

export function trackSettingsPopupAnimation(
  controls: AnimationPlaybackControls,
): void {
  activePopupAnimations.push(controls);
}

export function stopSettingsPopupAnimations(): void {
  for (const animation of activePopupAnimations) {
    try {
      animation.stop();
    } catch {
      /* ignore */
    }
  }
  activePopupAnimations = [];
}

export function resetSettingsPopupVisualState(extensionPopup: HTMLElement): void {
  extensionPopup.style.removeProperty("opacity");
  extensionPopup.style.removeProperty("transition");
  const panel = extensionPopup.shadowRoot?.querySelector<HTMLElement>(
    "[data-settings-panel]",
  );
  if (panel) {
    panel.style.removeProperty("opacity");
    panel.style.removeProperty("scale");
  }
}
