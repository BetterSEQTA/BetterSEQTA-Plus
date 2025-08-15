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
  var AddedSettings = document.getElementById("AddedSettings");
  var extensionPopup = document.getElementById("ExtensionPopup");

  AddedSettings!.addEventListener("click", async () => {
    if (SettingsClicked) {
      closeExtensionPopup(extensionPopup as HTMLElement);
    } else {
      renderSettingsIfNeeded();

      await delay(30);
      
      if (settingsState.animations) {
        animate(0, 1, {
          onUpdate: (progress) => {
            extensionPopup!.style.opacity = progress.toString();
            extensionPopup!.style.transform = `scale(${progress})`;
          },
          type: "spring",
          stiffness: 280,
          damping: 20,
        });
      } else {
        extensionPopup!.style.opacity = "1";
        extensionPopup!.style.transform = "scale(1)";
        extensionPopup!.style.transition =
          "opacity 0s linear, transform 0s linear";
      }
      extensionPopup!.classList.remove("hide");
      changeSettingsClicked(true);
    }
  });
}
