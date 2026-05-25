import renderSvelte from "@/interface/main";
import { unmount } from "svelte";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import {
  applyWidgetVisibility,
  disconnectLoadingIndicatorObserver,
  setupLoadingIndicatorObserver,
} from "@/seqta/utils/Loaders/LoadTeachHomePage";
import TeachHomePage from "./TeachHomePage.svelte";

export const BETTERSEQTA_HOME_ROUTE = "/betterseqta-home";
export const TEACH_HOME_ROOT_ID = "teach-home-root";

let routeListenerSetup = false;
let isLoadingHomePage = false;
let teachHomeApp: ReturnType<typeof renderSvelte> | null = null;
let widgetsSettingsRegistered = false;

export function updateTeachHomeMenuActive(isHome: boolean): void {
  const homeButton = document.getElementById("betterseqta-teach-homebutton");
  if (!homeButton) return;

  if (isHome) {
    homeButton.classList.add("active");
    homeButton.setAttribute("aria-current", "page");
  } else {
    homeButton.classList.remove("active");
    homeButton.removeAttribute("aria-current");
  }
}

function isOnTeachHomeRoute(): boolean {
  return window.location.pathname.includes(BETTERSEQTA_HOME_ROUTE);
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
    (el as HTMLElement).style.display = "none";
  });
}

function cleanupTeachHomePage(): void {
  disconnectLoadingIndicatorObserver();

  if (teachHomeApp) {
    unmount(teachHomeApp);
    teachHomeApp = null;
  }

  document.getElementById(TEACH_HOME_ROOT_ID)?.remove();
  showChromeContent();
  document.body.removeAttribute("data-betterseqta-home-active");
  updateTeachHomeMenuActive(false);
}

async function mountTeachHomePageContent(): Promise<void> {
  if (isLoadingHomePage || teachHomeApp) {
    return;
  }

  isLoadingHomePage = true;
  console.info("[BetterSEQTA+] Mounting BetterSEQTA+ Teach home (Svelte)");

  try {
    const main = (await waitForElm(
      "#root > div > main, main",
      true,
      100,
      50,
    )) as HTMLElement;

    hideChromeContent();
    hideUnknownPageUi();

    let mountPoint = document.getElementById(TEACH_HOME_ROOT_ID);
    if (!mountPoint) {
      mountPoint = document.createElement("div");
      mountPoint.id = TEACH_HOME_ROOT_ID;
      mountPoint.className = "home-root";
      mountPoint.setAttribute("data-betterseqta-homepage", "true");
      main.appendChild(mountPoint);
    }

    document.body.setAttribute("data-betterseqta-home-active", "true");
    document.title = "Home ― BetterSEQTA+";
    updateTeachHomeMenuActive(true);
    setupLoadingIndicatorObserver();

    if (!widgetsSettingsRegistered) {
      widgetsSettingsRegistered = true;
      settingsState.register("teachHomeWidgets", () => {
        applyWidgetVisibility();
      });
    }

    teachHomeApp = renderSvelte(TeachHomePage, mountPoint);
    applyWidgetVisibility();
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to mount Teach home page:", error);
    cleanupTeachHomePage();
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
    return;
  }
  routeListenerSetup = true;

  const checkRoute = () => {
    if (isOnTeachHomeRoute()) {
      hideUnknownPageUi();
      setupLoadingIndicatorObserver();
      void mountTeachHomePageContent();
    } else {
      cleanupTeachHomePage();
    }
  };

  window.addEventListener("popstate", checkRoute);

  let lastPath = window.location.pathname;
  setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      checkRoute();
    }
  }, 1000);

  requestAnimationFrame(() => {
    setTimeout(checkRoute, 100);
  });
}

export async function loadTeachHomePage(): Promise<void> {
  setupRouteListener();

  if (!isOnTeachHomeRoute()) {
    return;
  }

  await mountTeachHomePageContent();
}
