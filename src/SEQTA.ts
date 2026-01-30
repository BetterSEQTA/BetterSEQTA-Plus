import {
  initializeSettingsState,
  settingsState,
} from "@/seqta/utils/listeners/SettingsState";
import documentLoadCSS from "@/css/documentload.scss?inline";
import icon48 from "@/resources/icons/icon-48.png?base64";
import browser from "webextension-polyfill";

import * as plugins from "@/plugins";
import { main } from "@/seqta/main";
import { delay } from "./seqta/utils/delay";
import { initializeHideSensitiveToggle } from "@/seqta/utils/hideSensitiveToggle";

export let MenuOptionsOpen = false;

var IsSEQTAPage = false;
let hasSEQTAText = false;

// This check is placed outside of the document load event due to issues with EP (https://github.com/BetterSEQTA/BetterSEQTA-Plus/issues/84)
if (document.childNodes[1]) {
  hasSEQTAText =
    document.childNodes[1].textContent?.includes(
      "Copyright (c) SEQTA Software",
    ) ?? false;
  init();
}

async function init() {
  if (hasSEQTAText && document.title.includes("SEQTA Learn") && !IsSEQTAPage) {
    IsSEQTAPage = true;
    console.info("[BetterSEQTA+] Verified SEQTA Page");

    const style = document.createElement("style");
    style.textContent = documentLoadCSS;
    document.head.appendChild(style);

    document
      .querySelectorAll<HTMLLinkElement>('link[rel*="icon"]')
      .forEach((link) => {
        link.href = icon48;
      });

    try {
      await initializeSettingsState();

      if (typeof settingsState.onoff === "undefined") {
        await browser.runtime.sendMessage({ type: "setDefaultStorage" });

        await delay(5);
      }

      await main();
      plugins.Monofile();

      if (settingsState.onoff) {
        await plugins.initializePlugins();
      }

      if (settingsState.devMode) {
        initializeHideSensitiveToggle();
      }

      console.info(
        "[BetterSEQTA+] Successfully initialised BetterSEQTA+, starting to load assets.",
      );
    } catch (error) {
      console.error(error);
    }
  }
}
