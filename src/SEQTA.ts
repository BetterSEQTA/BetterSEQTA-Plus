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

// I wanted to add a easter egg
(function () {
  const KONAMI_CODE = [ // konami code is a classic old code from video games during olden days
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
  ];
  let konamiIndex = 0;

  window.addEventListener('keydown', function (e) {
    const key = e.key;
    if (key === KONAMI_CODE[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === KONAMI_CODE.length) {
        // open a new tab with game link
        window.open(browser.runtime.getURL('resources/snake.html'), '_blank');
        konamiIndex = 0;
      }
    } else {
      // Reset if wrong key
      konamiIndex = key === KONAMI_CODE[0] ? 1 : 0;
    }
  });
})();

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
  const hasSEQTATitle = document.title.includes("SEQTA Learn");

  if (hasSEQTAText && hasSEQTATitle && !IsSEQTAPage) {
    // Verify we are on a SEQTA page
    IsSEQTAPage = true;
    console.info("[BetterSEQTA+] Verified SEQTA Page");

    const documentLoadStyle = document.createElement("style");
    documentLoadStyle.textContent = documentLoadCSS;
    document.head.appendChild(documentLoadStyle);

    const icon = document.querySelector(
      'link[rel*="icon"]',
    )! as HTMLLinkElement;
    icon.href = icon48; // Change the icon

    try {
      await initializeSettingsState();

      if (typeof settingsState.onoff === "undefined") {
        await browser.runtime.sendMessage({ type: "setDefaultStorage" });

        await delay(5);
      }

      await main();

      if (settingsState.onoff) {
        // Initialize legacy plugins
        plugins.Monofile();

        // Initialize new plugin system
        await plugins.initializePlugins();
      }

      console.info(
        "[BetterSEQTA+] Successfully initialised BetterSEQTA+, starting to load assets.",
      );
    } catch (error: any) {
      console.error(error);
    }
  }
}
