import {
  changeSettingsClicked,
  closeExtensionPopup,
  SettingsClicked,
} from "./Closers/closeExtensionPopup";
import { settingsState } from "./listeners/SettingsState";
import {
  animateSettingsOpen,
  prefetchSettingsShell,
} from "./settingsPopupAnimation";
import { renderSettingsIfNeeded } from "./Adders/AddExtensionSettings";

export function setupSettingsButton() {
  const AddedSettings = document.getElementById("AddedSettings");
  if (!AddedSettings) return;

  if (AddedSettings.dataset.bsplusSettingsBound === "1") return;
  AddedSettings.dataset.bsplusSettingsBound = "1";

  prefetchSettingsShell();

  AddedSettings.addEventListener("click", async () => {
    if (SettingsClicked) {
      closeExtensionPopup();
    } else {
      await openSettingsPopup();
    }
  });
}

export async function openSettingsPopup(): Promise<void> {
  if (SettingsClicked && document.getElementById("ExtensionPopup")) return;

  let extensionPopup = document.getElementById("ExtensionPopup");
  if (!extensionPopup) {
    const { addExtensionSettings } = await import("./Adders/AddExtensionSettings");
    addExtensionSettings();
    extensionPopup = document.getElementById("ExtensionPopup");
  }
  if (!extensionPopup) return;

  await renderSettingsIfNeeded();
  animateSettingsOpen(extensionPopup);
  changeSettingsClicked(true);
}
