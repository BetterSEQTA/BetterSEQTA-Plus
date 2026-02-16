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

async function init() {
  // Use improved platform detection instead of just checking title format
  // This handles cases where title is "In brief - Student summary - SEQTA" etc.
  const platform = await detectSEQTAPlatform();
  const hasSEQTATitle = document.title.includes("SEQTA") || platform !== 'unknown';

  if (hasSEQTAText && hasSEQTATitle && !IsSEQTAPage) {
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

    replaceIcons();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {

        if (
          mutation.type === "attributes" &&
          mutation.target instanceof HTMLLinkElement &&
          mutation.target.rel.includes("icon") &&
          mutation.attributeName === "href"
        ) {
          replaceIcons();
          return;
        }
      }
    });

    observer.observe(document.head, {
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
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

function replaceIcons() {
  document
    .querySelectorAll<HTMLLinkElement>('link[rel*="icon"]')
    .forEach((link) => {
      if (link.href !== icon48) {
        link.href = icon48;
      }
    });
}