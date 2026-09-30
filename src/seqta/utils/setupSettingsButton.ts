import { closeExtensionPopup, getSettingsOpenGeneration } from "./Closers/closeExtensionPopup";
import { animateSettingsOpen, isExtensionSettingsOpen, prefetchSettingsShell } from "./settingsPopupAnimation";
import { renderSettingsIfNeeded } from "./Adders/AddExtensionSettings";

export function setupSettingsButton() {
  const AddedSettings = document.getElementById("AddedSettings");
  if (!AddedSettings) return;

  if (AddedSettings.dataset.bsplusSettingsBound === "1") return;
  AddedSettings.dataset.bsplusSettingsBound = "1";

  prefetchSettingsShell();

  AddedSettings.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (isExtensionSettingsOpen()) {
      closeExtensionPopup();
    } else {
      await openSettingsPopup();
    }
  });
}

let openSettingsInFlight: { gen: number; promise: Promise<void> } | null = null;

export async function openSettingsPopup(): Promise<void> {
  if (isExtensionSettingsOpen()) return;

  const gen = getSettingsOpenGeneration();
  if (openSettingsInFlight?.gen === gen) return openSettingsInFlight.promise;

  const promise = (async () => {
    try {
      let host = document.getElementById("ExtensionPopup");
      if (!host) {
        const { addExtensionSettings } = await import("./Adders/AddExtensionSettings");
        addExtensionSettings();
        host = document.getElementById("ExtensionPopup");
      }
      if (!host) return;

      await renderSettingsIfNeeded();
      if (gen !== getSettingsOpenGeneration()) return;

      host = document.getElementById("ExtensionPopup");
      if (host) animateSettingsOpen(host);
    } finally {
      if (openSettingsInFlight?.gen === gen) openSettingsInFlight = null;
    }
  })();

  openSettingsInFlight = { gen, promise };
  return promise;
}
