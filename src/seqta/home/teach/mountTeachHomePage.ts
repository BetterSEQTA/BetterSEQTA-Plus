import renderSvelte from "@/interface/main";
import { unmount } from "svelte";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import {
  applyWidgetVisibility,
  disconnectLoadingIndicatorObserver,
  setupLoadingIndicatorObserver,
} from "@/seqta/utils/Loaders/LoadTeachHomePage";
import { syncTeachDocumentTitle } from "@/seqta/utils/normalizeTeachTitle";
import { syncTeachNavActiveStates } from "@/seqta/utils/teachChrome";
import { isTeachHomePath } from "@/seqta/utils/teachPath";
import TeachHomePage from "./TeachHomePage.svelte";

export const BETTERSEQTA_HOME_ROUTE = "/betterseqta-home";
export const TEACH_HOME_ROOT_ID = "teach-home-root";

let routeListenerSetup = false;
let isLoadingHomePage = false;
let teachHomeApp: ReturnType<typeof renderSvelte> | null = null;
let widgetsSettingsRegistered = false;
let unknownPageObserver: MutationObserver | null = null;
let mountRetryTimer: ReturnType<typeof setTimeout> | null = null;

export function updateTeachHomeMenuActive(isHome: boolean): void {
  const targets = [
    document.getElementById("betterseqta-teach-homebutton"),
    document.getElementById("betterseqta-teach-pagelist-home"),
  ].filter(Boolean) as HTMLElement[];

  for (const el of targets) {
    if (isHome) {
      el.classList.add("active");
      el.setAttribute("aria-current", "page");
    } else {
      el.classList.remove("active");
      el.removeAttribute("aria-current");
    }
  }
}

function isOnTeachHomeRoute(): boolean {
  return isTeachHomePath();
}

function hideChromeContent(): void {
  const chromeContent = document.querySelector(
    '[class*="Chrome__content"]',
  ) as HTMLElement | null;
  if (chromeContent) {
    chromeContent.style.display = "none";
  }
}

function showChromeContent(): void {
  const chromeContent = document.querySelector(
    '[class*="Chrome__content"]',
  ) as HTMLElement | null;
  if (chromeContent) {
    chromeContent.style.display = "";
  }
}

function hideUnknownPageUi(): void {
  const unknownPageElements = document.querySelectorAll(
    '[class*="Unknown"], [class*="NotFound"], [class*="404"]',
  );
  unknownPageElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.setProperty("display", "none", "important");
    htmlEl.setAttribute("data-betterseqta-hidden-unknown", "true");
  });

  // SEQTA often renders the 404 copy as plain text under main/header
  document.querySelectorAll("main h1, main p, main [class*='Chrome']").forEach((el) => {
    const text = (el.textContent || "").trim().toLowerCase();
    if (
      text === "unknown page" ||
      text.includes("page not found") ||
      text.includes("could not be found")
    ) {
      const htmlEl = el as HTMLElement;
      htmlEl.style.setProperty("display", "none", "important");
      htmlEl.setAttribute("data-betterseqta-hidden-unknown", "true");
    }
  });
}

function observeUnknownPageWhileHome(): void {
  unknownPageObserver?.disconnect();
  if (!isOnTeachHomeRoute()) return;

  unknownPageObserver = new MutationObserver(() => {
    if (!isOnTeachHomeRoute()) return;
    hideUnknownPageUi();
    hideChromeContent();
    if (!document.getElementById(TEACH_HOME_ROOT_ID) && !isLoadingHomePage) {
      void mountTeachHomePageContent();
    }
  });
  unknownPageObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function stopUnknownPageObserver(): void {
  unknownPageObserver?.disconnect();
  unknownPageObserver = null;
}

function markHomeShellActive(): void {
  document.body?.setAttribute("data-seqta-platform", "teach");
  document.body?.setAttribute("data-betterseqta-home-active", "true");
  hideChromeContent();
  hideUnknownPageUi();
  updateTeachHomeMenuActive(true);
}

function cleanupTeachHomePage(): void {
  disconnectLoadingIndicatorObserver();
  stopUnknownPageObserver();
  if (mountRetryTimer) {
    clearTimeout(mountRetryTimer);
    mountRetryTimer = null;
  }

  if (teachHomeApp) {
    unmount(teachHomeApp);
    teachHomeApp = null;
  }

  document.getElementById(TEACH_HOME_ROOT_ID)?.remove();
  showChromeContent();
  document.body?.removeAttribute("data-betterseqta-home-active");
  updateTeachHomeMenuActive(false);
}

async function mountTeachHomePageContent(): Promise<void> {
  if (!isOnTeachHomeRoute()) return;
  if (isLoadingHomePage) return;
  if (teachHomeApp && document.getElementById(TEACH_HOME_ROOT_ID)) return;

  isLoadingHomePage = true;
  markHomeShellActive();
  observeUnknownPageWhileHome();
  console.info("[BetterSEQTA+] Mounting BetterSEQTA+ Teach home (Svelte)");

  try {
    const main = (await waitForElm(
      "#root > div > main, main",
      true,
      100,
      80,
    )) as HTMLElement;

    markHomeShellActive();

    let mountPoint = document.getElementById(TEACH_HOME_ROOT_ID);
    if (!mountPoint) {
      mountPoint = document.createElement("div");
      mountPoint.id = TEACH_HOME_ROOT_ID;
      mountPoint.className = "home-root";
      mountPoint.setAttribute("data-betterseqta-homepage", "true");
      main.appendChild(mountPoint);
    }

    document.title = "Home ― SEQTA Teach";
    setupLoadingIndicatorObserver();

    if (!widgetsSettingsRegistered) {
      widgetsSettingsRegistered = true;
      settingsState.register("teachHomeWidgets", () => {
        applyWidgetVisibility();
      });
    }

    if (!teachHomeApp) {
      teachHomeApp = renderSvelte(TeachHomePage, mountPoint);
    }
    applyWidgetVisibility();
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to mount Teach home page:", error);
    // Keep shell active and retry — do not flash SEQTA 404
    markHomeShellActive();
    if (mountRetryTimer) clearTimeout(mountRetryTimer);
    mountRetryTimer = setTimeout(() => {
      mountRetryTimer = null;
      void mountTeachHomePageContent();
    }, 750);
  } finally {
    isLoadingHomePage = false;
  }
}

export function navigateToTeachHome(): void {
  const currentPath = window.location.pathname;
  if (!currentPath.includes(BETTERSEQTA_HOME_ROUTE)) {
    window.history.pushState({}, "", BETTERSEQTA_HOME_ROUTE);
    window.dispatchEvent(new PopStateEvent("popstate"));
  } else {
    void loadTeachHomePage();
  }
}

export function setupRouteListener(): void {
  if (routeListenerSetup) {
    if (isOnTeachHomeRoute()) {
      markHomeShellActive();
      void mountTeachHomePageContent();
    }
    return;
  }
  routeListenerSetup = true;

  const checkRoute = () => {
    if (isOnTeachHomeRoute()) {
      markHomeShellActive();
      observeUnknownPageWhileHome();
      setupLoadingIndicatorObserver();
      void mountTeachHomePageContent();
    } else {
      cleanupTeachHomePage();
      // Keep titles as "… ― SEQTA Teach" after SPA navigations
      syncTeachDocumentTitle();
    }
    syncTeachNavActiveStates();
  };

  window.addEventListener("popstate", checkRoute);

  let lastPath = window.location.pathname;
  setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      checkRoute();
    }
  }, 400);

  // Immediate + delayed checks — SEQTA often paints 404 before our mount
  checkRoute();
  requestAnimationFrame(() => {
    setTimeout(checkRoute, 50);
    setTimeout(checkRoute, 300);
    setTimeout(checkRoute, 1000);
  });
}

export async function loadTeachHomePage(): Promise<void> {
  setupRouteListener();

  if (!isOnTeachHomeRoute()) {
    return;
  }

  await mountTeachHomePageContent();
}
