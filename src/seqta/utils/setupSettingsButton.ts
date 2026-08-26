import {
  changeSettingsClicked,
  closeExtensionPopup,
  SettingsClicked,
} from "./Closers/closeExtensionPopup";
import { animate } from "motion";
import { settingsState } from "./listeners/SettingsState";
import { renderSettingsIfNeeded } from "./Adders/AddExtensionSettings";
import { delay } from "./delay";
import {
  beginSettingsPopupTransition,
  isCurrentSettingsPopupTransition,
  trackSettingsPopupAnimation,
} from "./settingsPopupTransition";

export function setupSettingsButton() {
  const AddedSettings = document.getElementById("AddedSettings");
  if (!AddedSettings) return;

  // Avoid stacking duplicate listeners if Engage remounts the toolbar.
  if (AddedSettings.dataset.bsplusSettingsBound === "1") return;
  AddedSettings.dataset.bsplusSettingsBound = "1";

  AddedSettings.addEventListener("click", async () => {
    if (SettingsClicked) {
      closeExtensionPopup();
    } else {
      await openSettingsPopup();
    }
  });
}

export async function openSettingsPopup(): Promise<void> {
  let extensionPopup = document.getElementById("ExtensionPopup");
  if (
    SettingsClicked &&
    extensionPopup &&
    !extensionPopup.classList.contains("hide")
  ) {
    return;
  }

  const generation = beginSettingsPopupTransition();
  changeSettingsClicked(true);

  if (!extensionPopup) {
    const { addExtensionSettings } = await import("./Adders/AddExtensionSettings");
    addExtensionSettings();
    extensionPopup = document.getElementById("ExtensionPopup");
  }
  if (!extensionPopup) {
    changeSettingsClicked(false);
    return;
  }

  await renderSettingsIfNeeded();
  if (!isCurrentSettingsPopupTransition(generation)) return;

  await delay(30);
  if (!isCurrentSettingsPopupTransition(generation)) return;

  extensionPopup.style.transform = "none";
  extensionPopup.classList.remove("hide");

  const panel = extensionPopup.shadowRoot?.querySelector<HTMLElement>(
    "[data-settings-panel]",
  );
  if (settingsState.animations) {
    extensionPopup.style.opacity = "0";
    trackSettingsPopupAnimation(
      animate(0, 1, {
        onUpdate: (progress) => {
          if (!isCurrentSettingsPopupTransition(generation)) return;
          extensionPopup.style.opacity = progress.toString();
        },
        type: "spring",
        stiffness: 280,
        damping: 20,
      }),
    );
    if (panel) {
      trackSettingsPopupAnimation(
        animate(
          panel,
          { scale: [0, 1], opacity: [0, 1] },
          { type: "spring", stiffness: 330, damping: 30 },
        ),
      );
    }
  } else {
    extensionPopup.style.opacity = "1";
    extensionPopup.style.transition = "opacity 0s linear";
    if (panel) {
      panel.style.scale = "1";
      panel.style.opacity = "1";
    }
  }
}
