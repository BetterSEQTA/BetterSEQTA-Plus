import {
  changeSettingsClicked,
  closeExtensionPopup,
  SettingsClicked,
} from "../Closers/closeExtensionPopup";
import renderSvelte from "@/interface/main";
import { SettingsResizer } from "@/seqta/ui/SettingsResizer";
import Settings from "@/interface/pages/settings.svelte";

let isSettingsRendered = false;

export function addExtensionSettings() {
  const extensionPopup = document.createElement("div");
  extensionPopup.classList.add("outside-container", "hide");
  extensionPopup.id = "ExtensionPopup";

  const extensionContainer = document.querySelector(
    "#container",
  ) as HTMLDivElement;
  if (extensionContainer) extensionContainer.appendChild(extensionPopup);

  const container = document.getElementById("container");

  new SettingsResizer();

  container!.onclick = (event) => {
    if (!SettingsClicked) return;

    if (!(event.target as HTMLElement).closest("#AddedSettings")) {
      if (event.target == extensionPopup) return;
      changeSettingsClicked(closeExtensionPopup());
    }
  };
}

export function renderSettingsIfNeeded() {
  if (isSettingsRendered) return;
  
  const extensionPopup = document.getElementById("ExtensionPopup");
  if (!extensionPopup) return;

  try {
    const shadow = extensionPopup.attachShadow({ mode: "open" });
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => renderSvelte(Settings, shadow));
    } else {
      renderSvelte(Settings, shadow);
    }
    isSettingsRendered = true;
  } catch (err) {
    console.error(err);
  }
}
