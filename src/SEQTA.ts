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
import {
  childTextHasSeqtaCopyright,
  initBetterseqtaWasm,
  isBetterseqtaWasmReady,
  titleIsSeqtaLearnOrEngage,
} from "@/wasm/init";

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

function scheduleDeferredPluginInitialization() {
  const start = () => {
    void plugins.initializePlugins().catch((error) => {
      console.error("[BetterSEQTA+] Deferred plugin initialization failed:", error);
    });
  };

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const idle = window.requestIdleCallback as (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
    idle(() => start(), { timeout: 1200 });
    return;
  }

  // Fallback for browsers without requestIdleCallback.
  setTimeout(start, 0);
}

export let MenuOptionsOpen = false;

var IsSEQTAPage = false;
let hasSEQTAText = false;

function childTextLooksLikeSeqtaCopyright(text: string): boolean {
  return text.includes("Copyright (c) SEQTA Software");
}

function titleLooksLikeSeqtaLearnOrEngage(title: string): boolean {
  return title.includes("SEQTA Learn") || title.includes("SEQTA Engage");
}

// This check is placed outside of the document load event due to issues with EP (https://github.com/BetterSEQTA/BetterSEQTA-Plus/issues/84)
if (document.childNodes[1]) {
  void bootstrap();
}

async function bootstrap() {
  try {
    await initBetterseqtaWasm();
  } catch (e) {
    console.warn("[BetterSEQTA+] WASM init failed, using JS fallbacks:", e);
  }

  const childText = document.childNodes[1]?.textContent;
  hasSEQTAText =
    typeof childText === "string" &&
    (isBetterseqtaWasmReady()
      ? childTextHasSeqtaCopyright(childText)
      : childTextLooksLikeSeqtaCopyright(childText));

  await init();
}

async function init() {
  const titleOk = isBetterseqtaWasmReady()
    ? titleIsSeqtaLearnOrEngage(document.title)
    : titleLooksLikeSeqtaLearnOrEngage(document.title);

  if (hasSEQTAText && titleOk && !IsSEQTAPage) {
    IsSEQTAPage = true;
    console.info("[BetterSEQTA+] Verified SEQTA Page");

    if (typeof window !== "undefined" && window === window.top) {
      void browser.runtime.sendMessage({ type: "cloudSettingsPoll" }).catch(() => {});
    }

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

      if (typeof settingsState.onoff === "undefined") {
        await browser.runtime.sendMessage({ type: "setDefaultStorage" });

        await delay(5);
      }

      await main();
      plugins.Monofile();

      if (settingsState.onoff) {
        scheduleDeferredPluginInitialization();
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
