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

// Standalone 404 documents never pass the SEQTA SPA gate above.
void bootErrorPage();

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

function shouldBootKitten404(): boolean {
  if (IsSEQTAPage || document.getElementById("container")) return false;
  return /404|not found/i.test(document.title);
}

/** Hide the rebranded 404 before the kitten card mounts (removed after boot). */
function inject404FlashHide(): void {
  if (document.getElementById("bsplus-404-flash-hide")) return;
  const style = document.createElement("style");
  style.id = "bsplus-404-flash-hide";
  style.textContent =
    "html,body{background:#333!important}.message{display:none!important}";
  (document.head ?? document.documentElement).appendChild(style);
}

async function bootErrorPage() {
  if (IsSEQTAPage) return;

  const storagePromise = browser.storage.local.get([
    "onoff",
    "plugin.error-page-kitten.settings",
  ]);

  const watchTitle = () => {
    if (shouldBootKitten404()) inject404FlashHide();
  };
  watchTitle();
  if (document.readyState === "loading") {
    document.addEventListener("readystatechange", watchTitle);
  }

  if (document.readyState === "loading") {
    await new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }
  document.removeEventListener("readystatechange", watchTitle);

  if (!shouldBootKitten404()) return;

  const stored = await storagePromise;
  if ((stored.onoff ?? true) === false) return;
  const kittenSettings = stored["plugin.error-page-kitten.settings"] as
    | { enabled?: boolean }
    | undefined;
  if (kittenSettings?.enabled === false) return;

  try {
    const { mountErrorPageKitten } = await import(
      "@/plugins/built-in/errorPageKitten"
    );
    mountErrorPageKitten();
    document.getElementById("bsplus-404-flash-hide")?.remove();
  } catch (error) {
    document.getElementById("bsplus-404-flash-hide")?.remove();
    document
      .querySelectorAll(".bsplus-kitten-404-hidden")
      .forEach((el) => el.classList.remove("bsplus-kitten-404-hidden"));
    console.error("[BetterSEQTA+] Failed to boot 404 page:", error);
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