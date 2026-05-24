import {
  changeSettingsClicked,
  closeExtensionPopup,
  SettingsClicked,
} from "../Closers/closeExtensionPopup";
import renderSvelte from "@/interface/main";
import { SettingsResizer } from "@/seqta/ui/SettingsResizer";
import Settings from "@/interface/pages/settings.svelte";
import SettingsTeach from "@/interface/pages/settings-teach.svelte";
import { isSEQTATeachSync } from "../platformDetection";

let isSettingsRendered = false;

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

  const mountParent = isSEQTATeachSync()
    ? document.body
    : ((document.querySelector("#container") ??
        document.getElementById("container") ??
        document.body) as HTMLElement);
  mountParent.appendChild(extensionPopup);

  new SettingsResizer();

  const clickTarget = isSEQTATeachSync()
    ? document.body
    : (document.getElementById("container") ?? document.body);
  clickTarget.addEventListener(
    "click",
    extensionOutsideClickHandler(extensionPopup),
    false,
  );
}

export function renderSettingsIfNeeded() {
  if (isSettingsRendered) return;

  const extensionPopup = document.getElementById("ExtensionPopup");
  if (!extensionPopup) return;

  try {
    const shadow = extensionPopup.attachShadow({ mode: "open" });
    const SettingsComponent = isSEQTATeachSync() ? SettingsTeach : Settings;

    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => renderSvelte(SettingsComponent, shadow));
    } else {
      renderSvelte(SettingsComponent, shadow);
    }
    isSettingsRendered = true;
  } catch (err) {
    console.error(err);
  }
}
