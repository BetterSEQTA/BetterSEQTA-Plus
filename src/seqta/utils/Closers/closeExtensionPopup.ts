import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { animate } from "motion";

import { settingsPopup } from "@/seqta/utils/settingsPopup";
import {
  beginSettingsPopupTransition,
  isCurrentSettingsPopupTransition,
  resetSettingsPopupVisualState,
  trackSettingsPopupAnimation,
} from "@/seqta/utils/settingsPopupTransition";

export let SettingsClicked = false;

export const closeExtensionPopup = (extensionPopup?: HTMLElement) => {
  const generation = beginSettingsPopupTransition();
  changeSettingsClicked(false);

  if (!extensionPopup) {
    extensionPopup = document.getElementById("ExtensionPopup") ?? undefined;
  }
  if (!extensionPopup) return false;

  extensionPopup.classList.add("hide");
  resetSettingsPopupVisualState(extensionPopup);

  if (settingsState.animations) {
    const panel = extensionPopup.shadowRoot?.querySelector<HTMLElement>(
      "[data-settings-panel]",
    );
    trackSettingsPopupAnimation(
      animate(1, 0, {
        onUpdate: (progress) => {
          if (!isCurrentSettingsPopupTransition(generation)) return;
          extensionPopup.style.opacity = Math.max(0, progress).toString();
        },
        duration: 0.18,
        ease: "easeIn",
      }),
    );
    if (panel) {
      trackSettingsPopupAnimation(
        animate(
          panel,
          { scale: [1, 0], opacity: [1, 0] },
          { duration: 0.18, ease: "easeIn" },
        ),
      );
    }
  } else {
    extensionPopup.style.opacity = "0";
  }

  settingsPopup.triggerClose();
  return false;
};

export function changeSettingsClicked(newVal: boolean) {
  SettingsClicked = newVal;
}
