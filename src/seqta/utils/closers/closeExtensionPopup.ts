import { settingsPopup } from "@/seqta/utils/settingsPopup";
import { animateSettingsClose } from "@/seqta/utils/settingsPopupAnimation";

let settingsOpenGeneration = 0;

export function getSettingsOpenGeneration(): number {
  return settingsOpenGeneration;
}

export const closeExtensionPopup = (extensionPopup?: HTMLElement) => {
  settingsOpenGeneration += 1;

  if (!extensionPopup) extensionPopup = document.getElementById("ExtensionPopup")!;

  if (extensionPopup) {
    animateSettingsClose(extensionPopup);
  }

  settingsPopup.triggerClose();
};
