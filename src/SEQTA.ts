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

// The 404 page is a bare document with no second childNode, so it must be
// booted unconditionally (outside the gate above). It self-guards on title.
bootErrorPage();

if (import.meta.env.DEV) {
  window.addEventListener("unhandledrejection", (event) => {
    recoverFromStaleDevModuleGraph(event.reason);
  });
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

      if (import.meta.env.DEV) {
        sessionStorage.removeItem("bsplus-dev-export-recovery");
      }

      verboseInfo(
        "[BetterSEQTA+] Successfully initialised BetterSEQTA+, starting to load assets.",
      );
    } catch (error) {
      console.error(error);
      recoverFromStaleDevModuleGraph(error);
    }
  }
}

// The 404 page is a standalone document that never passes the SPA gate above,
// so the normal plugin path never boots there; start just the classic kitten
// 404 plugin so it renders without any SPA work.
async function bootErrorPage() {
  if (IsSEQTAPage) return;

  // Runs at document_start, so <title> and body are not available yet; wait
  // for the DOM before testing the 404 title.
  await new Promise<void>((resolve) => {
    if (document.readyState !== "loading") {
      resolve();
      return;
    }
    document.addEventListener("DOMContentLoaded", () => resolve(), {
      once: true,
    });
  });

  const is404Page =
    /404/.test(document.title) || /not found/i.test(document.title);
  if (!is404Page) return;

  const stored = await browser.storage.local.get([
    "onoff",
    "plugin.error-page-kitten.settings",
  ]);
  if ((stored.onoff ?? true) === false) return;
  const kittenEnabled = (
    stored["plugin.error-page-kitten.settings"] as
      | { enabled?: boolean }
      | undefined
  )?.enabled;
  if (kittenEnabled === false) return;

  hideRebranded404();

  try {
    const { pluginManager } = await import("@/plugins/index");
    await pluginManager.startPlugin("error-page-kitten");
  } catch (error) {
    // Restore the rebranded page so the user is not left with a blank document.
    document
      .querySelectorAll<HTMLElement>(".bsplus-kitten-404-hidden")
      .forEach((el) => {
        el.classList.remove("bsplus-kitten-404-hidden");
        el.style.display = "";
      });
    console.error("[BetterSEQTA+] Failed to boot 404 page:", error);
  }
}

function hideRebranded404() {
  const message = document.querySelector<HTMLElement>(".message");
  if (message) {
    message.classList.add("bsplus-kitten-404-hidden");
    message.style.display = "none";
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

/** Vite/CRX HMR can leave modules with missing named exports until the graph is cleared. */
function recoverFromStaleDevModuleGraph(error: unknown) {
  if (!import.meta.env.DEV) return;

  const message = error instanceof Error ? error.message : String(error);
  if (!/does not provide an export named/.test(message)) return;

  const key = "bsplus-dev-export-recovery";
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");
    import.meta.hot?.send("bsplus:reset-module-graph");
    setTimeout(() => {
      location.reload();
    }, 80);
    return;
  }

  sessionStorage.removeItem(key);
  console.error(
    "[BetterSEQTA+] Dev module graph is still stale after recovery. Restart `npm run dev`, then reload this page.",
  );
}