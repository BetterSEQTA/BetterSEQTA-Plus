import {
  changeSettingsClicked,
  closeExtensionPopup,
  SettingsClicked,
} from "../Closers/closeExtensionPopup";
import { SettingsResizer } from "@/seqta/ui/SettingsResizer";

let isSettingsRendered = false;
let settingsLoadPromise: Promise<void> | null = null;

function extensionOutsideClickHandler(extensionPopup: HTMLElement) {
  return (event: MouseEvent) => {
    if (!SettingsClicked) return;

    if (!(event.target as HTMLElement).closest("#AddedSettings")) {
      // Clicks inside the shadow tree retarget to the host — keep open.
      if (event.target == extensionPopup) return;
      changeSettingsClicked(closeExtensionPopup());
    }
  };
}

/**
 * Mount the settings host on `document.body` so `position: fixed` covers the
 * viewport on both SEQTA Learn and SEQTA Engage (Engage often lacks `#container`
 * or wraps the app in stacking contexts that clip in-app overlays).
 */
export function addExtensionSettings() {
  if (document.getElementById("ExtensionPopup")) return;

  const extensionPopup = document.createElement("div");
  extensionPopup.classList.add("outside-container", "hide");
  extensionPopup.id = "ExtensionPopup";

  document.body.appendChild(extensionPopup);

  new SettingsResizer();

  const handler = extensionOutsideClickHandler(extensionPopup);
  document.body.addEventListener("click", handler, false);
}

async function loadSettingsUi(extensionPopup: HTMLElement): Promise<void> {
  if (isSettingsRendered) return;

  const [{ default: renderSvelte }, { default: Settings }] = await Promise.all([
    import("@/interface/main"),
    import("@/interface/pages/settings.svelte"),
  ]);

  const shadow = extensionPopup.attachShadow({ mode: "open" });
  const mount = () => renderSvelte(Settings, shadow);

  if ("requestIdleCallback" in window) {
    requestIdleCallback(mount);
  } else {
    mount();
  }

  isSettingsRendered = true;
}

export async function renderSettingsIfNeeded(): Promise<void> {
  if (isSettingsRendered) return;

  const extensionPopup = document.getElementById("ExtensionPopup");
  if (!extensionPopup) return;

  if (!settingsLoadPromise) {
    settingsLoadPromise = loadSettingsUi(extensionPopup).catch((err) => {
      settingsLoadPromise = null;
      console.error(err);
      throw err;
    });
  }

  await settingsLoadPromise;
}
