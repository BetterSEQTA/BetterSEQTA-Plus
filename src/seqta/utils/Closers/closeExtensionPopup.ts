import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { animate } from "motion";

import { settingsPopup } from "@/seqta/utils/settingsPopup";

export let SettingsClicked = false;

export const closeExtensionPopup = (extensionPopup?: HTMLElement) => {
  if (!extensionPopup)
    extensionPopup = document.getElementById("ExtensionPopup")!;

  extensionPopup.classList.add("hide");
  if (settingsState.animations) {
    const panel = extensionPopup.shadowRoot?.querySelector<HTMLElement>(
      "[data-settings-panel]",
    );
    animate(1, 0, {
      onUpdate: (progress) => {
        extensionPopup.style.opacity = Math.max(0, progress).toString();
      },
      duration: 0.18,
      ease: "easeIn",
    });
    if (panel) {
      animate(
        panel,
        { scale: [1, 0], opacity: [1, 0] },
        { duration: 0.18, ease: "easeIn" },
      );
    }
  } else {
    extensionPopup.style.opacity = "0";
  }

  settingsPopup.triggerClose();
  return (SettingsClicked = false);
};

export function changeSettingsClicked(newVal: boolean) {
  SettingsClicked = newVal;
}
