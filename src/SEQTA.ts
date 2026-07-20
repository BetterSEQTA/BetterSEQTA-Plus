import {
  initializeSettingsState,
  settingsState,
} from "@/seqta/utils/listeners/SettingsState";
import documentLoadCSS from "@/css/documentload.scss?inline";
import icon48 from "@/resources/icons/icon-48.png?base64";
import browser from "webextension-polyfill";

import { main } from "@/seqta/main";
import { delay } from "./seqta/utils/delay";
import { initializeHideSensitiveToggle } from "@/seqta/utils/hideSensitiveToggle";
import { installSeqtaMenuColourPatch } from "@/seqta/utils/patchSeqtaMenuUpdateColours";
import { installThemeImagePagePatch } from "@/seqta/utils/patchThemeImagesPageContext";
import { initVerboseLogging, verboseInfo } from "@/utils/verboseLog";

function registerFetchSeqtaAppLinkListener() {
  browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request?.type !== "fetchSeqtaAppLink") return false;
    void (async () => {
      try {
        const res = await fetch(`${location.origin}/seqta/student/load/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        });
        const data = await res.json();
        const statusOk = data?.status === "200" || data?.status === 200;
        const raw = data?.payload?.app_link;
        const appLink = typeof raw === "string" && raw.length > 0 ? raw : null;
        sendResponse({ appLink: statusOk ? appLink : null });
      } catch {
        sendResponse({ appLink: null });
      }
    })();
    return true;
  });
}

var IsSEQTAPage = false;
let hasSEQTAText = false;

// This check is placed outside of the document load event due to issues with EP (https://github.com/BetterSEQTA/BetterSEQTA-Plus/issues/84)
if (document.childNodes[1]) {
  hasSEQTAText =
    document.childNodes[1].textContent?.includes(
      "Copyright (c) SEQTA Software",
    ) ?? false;
  if (hasSEQTAText) {
    installSeqtaMenuColourPatch();
    installThemeImagePagePatch();
  }
  init();
}

async function init() {
  if (
    hasSEQTAText &&
    (document.title.includes("SEQTA Learn") ||
      document.title.includes("SEQTA Engage")) &&
    !IsSEQTAPage
  ) {
    IsSEQTAPage = true;
    verboseInfo("[BetterSEQTA+] Verified SEQTA Page");

    registerFetchSeqtaAppLinkListener();

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
      initVerboseLogging();

      if (typeof settingsState.onoff === "undefined") {
        await browser.runtime.sendMessage({ type: "setDefaultStorage" });

        await delay(5);
      }

      await main();

      const { init: Monofile } = await import("@/plugins/monofile");
      Monofile();

      if (settingsState.onoff) {
        const { initializePlugins } = await import("@/plugins/index");
        await initializePlugins();
      }

      if (settingsState.devMode) {
        initializeHideSensitiveToggle();
      }

      verboseInfo(
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