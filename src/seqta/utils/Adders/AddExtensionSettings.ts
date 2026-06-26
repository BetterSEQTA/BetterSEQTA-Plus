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
      if (event.target == extensionPopup) return;
      changeSettingsClicked(closeExtensionPopup());
    }
  };
}

export function addExtensionSettings() {
  if (document.getElementById("ExtensionPopup")) return;

  const extensionPopup = document.createElement("div");
  extensionPopup.classList.add("outside-container", "hide");
  extensionPopup.id = "ExtensionPopup";

  const extensionContainer =
    document.querySelector("#container") ?? document.getElementById("container");
  const mountParent = extensionContainer ?? document.body;
  mountParent.appendChild(extensionPopup);

  new SettingsResizer();

  const handler = extensionOutsideClickHandler(extensionPopup);
  (extensionContainer ?? document.body).addEventListener("click", handler, false);
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
