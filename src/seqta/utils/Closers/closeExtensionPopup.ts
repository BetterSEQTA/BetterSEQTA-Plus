import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { animate } from "motion";

import { settingsPopup } from "@/interface/hooks/SettingsPopup";

export let SettingsClicked = false;

export const closeExtensionPopup = (extensionPopup?: HTMLElement) => {
  if (!extensionPopup)
    extensionPopup = document.getElementById("ExtensionPopup")!;

  extensionPopup.classList.add("hide");
  if (settingsState.animations) {
    animate(1, 0, {
      onUpdate: (progress) => {
        extensionPopup.style.opacity = Math.max(0, progress).toString();
        extensionPopup.style.transform = `scale(${Math.max(0, progress)})`;
      },
      type: "spring",
      stiffness: 520,
      damping: 20,
    });
  } else {
    extensionPopup.style.opacity = "0";
    extensionPopup.style.transform = "scale(0)";
  }

  settingsPopup.triggerClose();
  return (SettingsClicked = false);
};

export function changeSettingsClicked(newVal: boolean) {
  SettingsClicked = newVal;
}
