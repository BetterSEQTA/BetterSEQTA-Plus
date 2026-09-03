import { settingsPopup } from "@/seqta/utils/settingsPopup";
import { animateSettingsClose } from "@/seqta/utils/settingsPopupAnimation";

export let SettingsClicked = false;

export const closeExtensionPopup = (extensionPopup?: HTMLElement) => {
  if (!extensionPopup) extensionPopup = document.getElementById("ExtensionPopup")!;

  if (extensionPopup) {
    animateSettingsClose(extensionPopup);
  }

  settingsPopup.triggerClose();
  return (SettingsClicked = false);
};

export function changeSettingsClicked(newVal: boolean) {
  SettingsClicked = newVal;
}
