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
import { detectSEQTAPlatform } from "@/seqta/utils/platformDetection";

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

/**
 * Initializes BetterSEQTA+ on a SEQTA page.
 *
 * This function performs the following steps:
 * 1. Verifies that the current page is a SEQTA page.
 * 2. Injects CSS styles for document loading.
 * 3. Changes the page's favicon.
 * 4. Initializes the extension's settings state.
 * 5. Sets default storage if settings are not already defined.
 * 6. Calls the main function to apply core BetterSEQTA+ modifications.
 * 7. Initializes legacy and new plugins if the extension is enabled.
 * 8. Logs success or error messages during initialization.
 */
async function init() {
  // Use improved platform detection instead of just checking title format
  // This handles cases where title is "In brief - Student summary - SEQTA" etc.
  const platform = await detectSEQTAPlatform();
  const hasSEQTATitle = document.title.includes("SEQTA") || platform !== 'unknown';

  if (hasSEQTAText && hasSEQTATitle && !IsSEQTAPage) {
    // Verify we are on a SEQTA page
    IsSEQTAPage = true;
    console.info("[BetterSEQTA+] Verified SEQTA Page");

    // Wait for document.head if it doesn't exist yet
    let headWaitAttempts = 0;
    const maxHeadWaitAttempts = 50; // 5 seconds max
    while (!document.head && headWaitAttempts < maxHeadWaitAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      headWaitAttempts++;
    }
    
    if (!document.head) {
      console.error('[BetterSEQTA+] document.head is still null after waiting, cannot inject styles');
      return;
    }

    const documentLoadStyle = document.createElement("style");
    documentLoadStyle.textContent = documentLoadCSS;
    document.head.appendChild(documentLoadStyle);

    const icons =
      document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]');

    icons.forEach((link) => {
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
    } catch (error: any) {
      console.error(error);
    }
  }
}
