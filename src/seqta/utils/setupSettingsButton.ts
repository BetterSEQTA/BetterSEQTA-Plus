import {
  changeSettingsClicked,
  closeExtensionPopup,
  SettingsClicked,
} from "./Closers/closeExtensionPopup";
import { animate } from "motion";
import { settingsState } from "./listeners/SettingsState";
import { renderSettingsIfNeeded } from "./Adders/AddExtensionSettings";
import { delay } from "./delay";

export function setupSettingsButton() {
  const AddedSettings = document.getElementById("AddedSettings");
  if (!AddedSettings) return;

  // Avoid stacking duplicate listeners if Engage remounts the toolbar.
  if (AddedSettings.dataset.bsplusSettingsBound === "1") return;
  AddedSettings.dataset.bsplusSettingsBound = "1";

  AddedSettings.addEventListener("click", async () => {
    // Re-query each click — Engage SPA navigations can recreate the host.
    let extensionPopup = document.getElementById("ExtensionPopup");
    if (!extensionPopup) {
      const { addExtensionSettings } = await import("./Adders/AddExtensionSettings");
      addExtensionSettings();
      extensionPopup = document.getElementById("ExtensionPopup");
    }
    if (!extensionPopup) return;

    if (SettingsClicked) {
      closeExtensionPopup(extensionPopup);
    } else {
      await renderSettingsIfNeeded();

      await delay(30);

      extensionPopup.style.transform = "none";
      if (settingsState.animations) {
        animate(0, 1, {
          onUpdate: (progress) => {
            extensionPopup.style.opacity = progress.toString();
          },
          type: "spring",
          stiffness: 280,
          damping: 20,
        });
      } else {
        extensionPopup.style.opacity = "1";
        extensionPopup.style.transition = "opacity 0s linear";
      }
      extensionPopup.classList.remove("hide");
      changeSettingsClicked(true);
    }
  });
}
