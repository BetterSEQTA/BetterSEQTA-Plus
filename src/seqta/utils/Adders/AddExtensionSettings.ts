import {
  changeSettingsClicked,
  closeExtensionPopup,
  SettingsClicked,
} from "../Closers/closeExtensionPopup";
import renderSvelte from "@/interface/main";
import { SettingsResizer } from "@/seqta/ui/SettingsResizer";
import Settings from "@/interface/pages/settings.svelte";
import { isSEQTATeach } from "../platformDetection";

let isSettingsRendered = false;

export function addExtensionSettings() {
  // Check if ExtensionPopup already exists
  if (document.getElementById("ExtensionPopup")) {
    return;
  }
  
  const extensionPopup = document.createElement("div");
  extensionPopup.classList.add("outside-container", "hide");
  extensionPopup.id = "ExtensionPopup";

  let extensionContainer: HTMLElement | null = null;
  
  if (isSEQTATeach()) {
    // For Teach, append to body or root
    extensionContainer = document.body;
  } else {
    // For Learn, use the original container
    extensionContainer = document.querySelector("#container") as HTMLDivElement;
  }
  
  if (extensionContainer) {
    extensionContainer.appendChild(extensionPopup);
  } else {
    console.error("[BetterSEQTA+] Could not find container for ExtensionPopup");
  }

  new SettingsResizer();

  // Set up click handler on the appropriate container
  const clickContainer = isSEQTATeach() ? document.body : document.getElementById("container");
  
  if (clickContainer) {
    clickContainer.onclick = (event) => {
      if (!SettingsClicked) return;

      if (!(event.target as HTMLElement).closest("#AddedSettings")) {
        if (event.target == extensionPopup) return;
        changeSettingsClicked(closeExtensionPopup());
      }
    };
  } else {
    console.error("[BetterSEQTA+] Could not find container for click handler");
  }
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
