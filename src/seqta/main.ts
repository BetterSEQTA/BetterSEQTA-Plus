import { settingsState } from "@/seqta/utils/listeners/SettingsState";

import pageState from "@/pageState.js?script&iife";
import { extensionPageScriptUrl } from "@/lib/extensionPageScriptUrl";

import injectedCSS from "@/css/injected.scss?inline";

export async function main() {
  if (!settingsState.onoff) return;
  injectPageState();

  // CRXJS can't hot-reload ?inline CSS, so dev imports the stylesheet directly.
  if (import.meta.env.MODE === "development") {
    void import("@/css/injected.scss");
  } else {
    const injectedStyle = document.createElement("style");
    injectedStyle.textContent = injectedCSS;
    document.head.appendChild(injectedStyle);
  }
}

function injectPageState() {
  const mainScript = document.createElement("script");
  mainScript.src = extensionPageScriptUrl(pageState);
  document.head.appendChild(mainScript);
}
