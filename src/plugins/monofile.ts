// Third-party libraries
import browser from "webextension-polyfill";
import { animate, stagger } from "motion";

// Internal utilities and functions
import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { delay } from "@/seqta/utils/delay";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { MessageHandler } from "@/seqta/utils/listeners/MessageListener";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { StorageChangeHandler } from "@/seqta/utils/listeners/StorageChanges";
import { eventManager } from "@/seqta/utils/listeners/EventManager";
import debounce from "@/seqta/utils/debounce";

// UI and theme management
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import RegisterClickListeners from "@/seqta/utils/listeners/ClickListeners";
import { AddBetterSEQTAElements } from "@/seqta/ui/AddBetterSEQTAElements";
import { updateAllColors } from "@/seqta/ui/colors/Manager";
import { applySelectedFont } from "@/seqta/ui/fonts/Manager";
import { verboseInfo, verboseLog } from "@/utils/verboseLog";
import loading from "@/seqta/ui/Loading";
import { SendNewsPage } from "@/seqta/utils/SendNewsPage";
import { getEngageRoutePage } from "@/seqta/utils/engageRoute";
import {
  loadEngageHomePage,
  updateEngageHomeMenuActive,
} from "@/seqta/utils/Loaders/LoadEngageHomePage";
import { loadHomePage } from "@/seqta/utils/Loaders/LoadHomePage";
import { isSeqtaTeachExperience } from "@/seqta/utils/isSeqtaTeach";
import { BETTERSEQTA_HOME_ROUTE, setupRouteListener, TEACH_HOME_ROOT_ID } from "@/seqta/home/teach/mountTeachHomePage";
import { runStartupPopupQueue } from "@/seqta/utils/Openers/StartupPopupQueue";

import {
  syncTimetableUrlMonitoring,
  updateTimetableTimes,
} from "@/seqta/utils/updateTimetableTimes";
import { attachTimetableColorisRecovery } from "@/seqta/utils/patchSeqtaMenuUpdateColours";

// JSON content
import { observeMenuItemPosition } from "@/seqta/utils/sidebarMenuIcons";

// Icons and fonts
import IconFamily from "@/resources/fonts/IconFamily.woff";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";

// Stylesheets
import iframeCSS from "@/css/iframe.scss?raw";

import { applyMenuItemVisibility } from "@/seqta/utils/menuItemVisibility";

export function hideSideBar() {
  const sidebar = document.getElementById("menu"); // The sidebar element to be closed
  const main = document.getElementById("main"); // The main content element that must be resized to fill the page

  const currentMenuWidth = window.getComputedStyle(sidebar!).width; // Get the styles of the different elements
  const currentContentPosition = window.getComputedStyle(main!).position;

  if (currentMenuWidth != "0") {
    // Actually modify it to collapse the sidebar
    sidebar!.style.width = "0";
  } else {
    sidebar!.style.width = "100%";
  }

  if (currentContentPosition != "relative") {
    main!.style.position = "relative";
  } else {
    main!.style.position = "absolute";
  }
}

let betterSeqtaFinishLoadDone = false;
let engageHashListenerAttached = false;

export async function finishLoad() {
  if (betterSeqtaFinishLoadDone) return;
  betterSeqtaFinishLoadDone = true;

  try {
    document.querySelector(".legacy-root")?.classList.remove("hidden");

    const loadingbk = document.getElementById("loading");
    loadingbk?.classList.add("closeLoading");
    await delay(501);
    loadingbk?.remove();
  } catch (err) {
    console.error("Error during loading cleanup:", err);
  }

  void runStartupPopupQueue();
}

export function GetCSSElement(file: string) {
  const cssFile = resolveExtensionAssetUrl(file);
  const fileref = document.createElement("link");
  fileref.setAttribute("rel", "stylesheet");
  fileref.setAttribute("type", "text/css");
  fileref.setAttribute("href", cssFile);

  return fileref;
}

function removeThemeTagsFromNotices() {
  const userHTMLArray = document.getElementsByClassName("userHTML");
  for (const item of userHTMLArray) {
    const iframe = item as HTMLIFrameElement;
    try {
      const doc = iframe.contentDocument;
      if (!doc?.body) continue;
      const body = doc.body;
      const bodyText = body.innerHTML;
      body.innerHTML = bodyText
        .replace(/\[\[[\w]+[:][\w]+[\]\]]+/g, "")
        .replace(/ +/, " ");
    } catch {
      // Cross-origin or otherwise inaccessible iframe (common during Engage load / filter frames)
    }
  }
}

async function updateIframesWithDarkMode(): Promise<void> {
  const cssLink = document.createElement("style");
  cssLink.classList.add("iframecss");
  const cssContent = document.createTextNode(iframeCSS);
  cssLink.appendChild(cssContent);

  eventManager.register(
    "iframeAdded",
    {
      selector: "iframe",
      customCheck: (element: Element) =>
        !element.classList.contains("iframecss"),
    },
    (element) => {
      const iframe = element as HTMLIFrameElement;
      try {
        applyDarkModeToIframe(iframe, cssLink);

        if (element.classList.contains("cke_wysiwyg_frame")) {
          (async () => {
            await delay(100);
            iframe.contentDocument?.body.setAttribute("spellcheck", "true");
          })();
        }
      } catch (error) {
        console.error("Error applying dark mode:", error);
      }
    },
  );
}

function applyDarkModeToIframe(
  iframe: HTMLIFrameElement,
  cssLink: HTMLStyleElement,
): void {
  const iframeDocument = iframe.contentDocument;
  if (!iframeDocument) return;

  iframe.onload = () => {
    applyDarkModeToIframe(iframe, cssLink);
  };

  if (settingsState.DarkMode) {
    iframeDocument.documentElement.classList.add("dark");
  }

  const head = iframeDocument.head;
  if (head && !head.querySelector(".iframecss")) {
    head.appendChild(cssLink.cloneNode(true));
  }
}

function SortMessagePageItems(messagesParentElement: any) {
  try {
    let filterbutton = document.createElement("div");
    filterbutton.classList.add("messages-filterbutton");
    filterbutton.innerText = "Filter";

    let header = document.querySelector(
      "[class*='MessageList__MessageList___']",
    ) as HTMLElement;
    header.append(filterbutton);
    messagesParentElement;
  } catch (error) {
    console.error("Error sorting message page items:", error);
  }
}

async function LoadPageElements(): Promise<void> {
  console.log("[BetterSEQTA+] LoadPageElements called");
  await AddBetterSEQTAElements();

  if (isSeqtaTeachExperience()) {
    setupRouteListener();
  }

  const sublink: string | undefined = isSeqtaEngageExperience()
    ? getEngageRoutePage()
    : window.location.href.split("/")[4];

  if (isSeqtaEngageExperience() && !engageHashListenerAttached) {
    engageHashListenerAttached = true;
    window.addEventListener("hashchange", () => {
      if (getEngageRoutePage() === "home") {
        void loadEngageHomePage();
      } else {
        updateEngageHomeMenuActive(false);
      }
    });
  }

  eventManager.register("messagesAdded", { selector: "div.messages" }, handleMessages);

  eventManager.register("noticesAdded", { selector: "div.notices" }, CheckNoticeTextColour);

  eventManager.register("dashboardAdded", { selector: "div.dashboard" }, handleDashboard);

  eventManager.register("documentsAdded", { selector: "div.documents" }, handleDocuments);

  eventManager.register("reportsAdded", { selector: "div.reports" }, handleReports);

  eventManager.register(
    "timetableAdded",
    { selector: "div.timetablepage" },
    async () => {
      attachTimetableColorisRecovery();
      await updateTimetableTimes();
    },
  );

  eventManager.register("noticesAdded", { selector: "div.notice" }, handleNotices);

  RegisterClickListeners();

  await handleSublink(sublink);
}

async function handleNotices(node: Element): Promise<void> {
  if (!(node instanceof HTMLElement)) return;
  if (!settingsState.animations) return;

  node.style.opacity = "0";

  // get index of node in relation to parent
  const index = Array.from(node.parentElement!.children).indexOf(node);

  animate(
    node,
    { opacity: [0, 1], y: [50, 0], scale: [0.99, 1] },
    {
      delay: 0.1 * index,
      type: "spring",
      stiffness: 250,
      damping: 20,
    },
  );
}

async function handleSublink(sublink: string | undefined): Promise<void> {
  if (isSeqtaEngageExperience()) {
    switch (sublink) {
      case undefined:
        window.location.replace(
          `${location.origin}/#?page=/${settingsState.defaultPage}`,
        );
        if (settingsState.defaultPage === "home") void loadEngageHomePage();
        finishLoad();
        break;
      case "home":
        window.location.replace(`${location.origin}/#?page=/home`);
        verboseInfo("[BetterSEQTA+] Started Init (SEQTA Engage home)");
        if (settingsState.onoff) void loadEngageHomePage();
        finishLoad();
        break;
      default:
        finishLoad();
        break;
    }
    return;
  }

  switch (sublink) {
    case "news":
      await handleNewsPage();
      break;
    case "analytics":
      verboseInfo("[BetterSEQTA+] Started Init (Analytics)");
      if (settingsState.onoff) {
        void import("@/plugins/built-in/gradeAnalytics/loadAnalyticsPage").then(
          (m) => m.loadAnalyticsPage(),
        );
      }
      finishLoad();
      break;
    case undefined:
      if (settingsState.defaultPage === "home") {
        if (isSeqtaTeachExperience()) {
          if (!window.location.pathname.includes(BETTERSEQTA_HOME_ROUTE)) {
            window.history.pushState({}, "", BETTERSEQTA_HOME_ROUTE);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
          if (settingsState.onoff) await loadHomePage();
        } else {
          window.location.replace(`${location.origin}/#?page=/home`);
          loadHomePage();
        }
      } else {
        window.location.replace(
          `${location.origin}/#?page=/${settingsState.defaultPage}`,
        );
      }
      if (settingsState.defaultPage === "documents")
        handleDocuments(document.querySelector(".documents")!);
      if (settingsState.defaultPage === "reports")
        handleReports(document.querySelector(".reports")!);
      if (settingsState.defaultPage === "messages")
        handleMessages(document.querySelector(".messages")!);

      finishLoad();
      break;
    case "home":
    case "betterseqta-home":
      if (isSeqtaTeachExperience()) {
        const existingHome = document.getElementById(TEACH_HOME_ROOT_ID);
        const isOnHomePage = window.location.pathname.includes(
          BETTERSEQTA_HOME_ROUTE,
        );

        if (!isOnHomePage) {
          window.history.pushState({}, "", BETTERSEQTA_HOME_ROUTE);
          window.dispatchEvent(new PopStateEvent("popstate"));
          verboseInfo("[BetterSEQTA+] Started Init");
          if (settingsState.onoff) loadHomePage();
        } else if (!existingHome && settingsState.onoff) {
          verboseInfo(
            "[BetterSEQTA+] On BetterSEQTA+ homepage, loading content",
          );
          loadHomePage();
        } else {
          verboseInfo("[BetterSEQTA+] Homepage already loaded");
        }
      } else {
        window.location.replace(`${location.origin}/#?page=/home`);
        verboseInfo("[BetterSEQTA+] Started Init");
        if (settingsState.onoff) loadHomePage();
      }
      finishLoad();
      break;

    default:
      await handleDefault();
      break;
  }
}

async function handleNewsPage(): Promise<void> {
  if (!settingsState.onoff) {
    finishLoad();
    return;
  }

  verboseInfo("[BetterSEQTA+] Started Init");
  try {
    await SendNewsPage();
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to load news page:", error);
  }
  finishLoad();
}

async function handleDefault(): Promise<void> {
  finishLoad();
}

async function handleMessages(node: Element): Promise<void> {
  if (!(node instanceof HTMLElement)) return;

  const element = document.getElementById("title")!.firstChild as HTMLElement;
  element.innerText = "Direct Messages";
  document.title = "Direct Messages ― SEQTA Learn";
  SortMessagePageItems(node);

  if (!settingsState.animations) return;

  // Hides messages on page load
  const style = document.createElement("style");
  style.classList.add("messageHider");
  style.innerHTML = "[data-message]{opacity: 0 !important;}";
  document.head.append(style);

  await waitForElm("[data-message]", true, 10);
  const messages = Array.from(
    document.querySelectorAll("[data-message]"),
  ).slice(0, 35);
  animate(
    messages,
    { opacity: [0, 1], y: [10, 0] },
    {
      delay: stagger(0.03),
      duration: 0.5,
      ease: [0.22, 0.03, 0.26, 1],
    },
  );

  document.head.querySelector("style.messageHider")?.remove();
}

async function handleDashboard(node: Element): Promise<void> {
  if (!(node instanceof HTMLElement)) return;
  if (!settingsState.animations) return;

  const style = document.createElement("style");
  style.classList.add("dashboardHider");
  style.innerHTML = ".dashboard{opacity: 0 !important;}";
  document.head.append(style);

  await waitForElm(".dashlet", true, 10);
  try {
    const children = document.querySelectorAll(".dashboard > *");
    if (children.length) {
      animate(
        children,
        { opacity: [0, 1], y: [10, 0] },
        {
          delay: stagger(0.1),
          duration: 0.5,
          ease: [0.22, 0.03, 0.26, 1],
        },
      );
    }
  } catch {
    // Avoid uncaught errors if motion hits an unexpected DOM state during load.
  }

  document.head.querySelector("style.dashboardHider")?.remove();
}

async function handleDocuments(node: Element): Promise<void> {
  if (!(node instanceof HTMLElement)) return;
  if (!settingsState.animations) return;

  await waitForElm(".document", true, 10);
  try {
    const rows = document.querySelectorAll(".documents tbody tr.document");
    if (rows.length) {
      animate(
        rows,
        { opacity: [0, 1], y: [10, 0] },
        {
          delay: stagger(0.05),
          duration: 0.5,
          ease: [0.22, 0.03, 0.26, 1],
        },
      );
    }
  } catch {
    // ignore
  }
}

async function handleReports(node: Element): Promise<void> {
  if (!(node instanceof HTMLElement)) return;
  if (!settingsState.animations) return;

  await waitForElm(".report", true, 10);
  try {
    const items = document.querySelectorAll(".reports .item");
    if (items.length) {
      animate(
        items,
        { opacity: [0, 1], y: [10, 0] },
        {
          delay: stagger(0.05, { startDelay: 0.2 }),
          duration: 0.5,
          ease: [0.22, 0.03, 0.26, 1],
        },
      );
    }
  } catch {
    // ignore
  }
}

const noticeContainers = new Set<Element>();
let noticeColourObserver: MutationObserver | null = null;

const adjustNoticeColor = (node: Element) => {
  const hex = (node as HTMLElement).style.cssText.split(" ")[1];
  if (!hex || !settingsState.DarkMode || GetThresholdOfColor(hex.slice(0, -1)) >= 100) return;
  (node as HTMLElement).style.cssText = "--color: undefined;";
};

const scanNotices = (el: Element) => {
  if (el.matches("div.notice")) adjustNoticeColor(el);
  el.querySelectorAll("div.notice").forEach(adjustNoticeColor);
};

const scanAddedNotices = debounce((mutations: MutationRecord[]) => {
  for (const m of mutations)
    for (const node of m.addedNodes)
      if (node instanceof Element) scanNotices(node);
}, 50);

function CheckNoticeTextColour(notice: Element) {
  scanNotices(notice);
  if (noticeContainers.has(notice)) return;
  if (!noticeColourObserver) {
    noticeColourObserver = new MutationObserver((mutations) => {
      scanAddedNotices(mutations);
      for (const m of mutations)
        for (const node of m.removedNodes)
          if (node instanceof Element && noticeContainers.has(node)) {
            noticeColourObserver!.unobserve(node);
            noticeContainers.delete(node);
          }
    });
  }
  noticeContainers.add(notice);
  noticeColourObserver.observe(notice, { childList: true, subtree: true });
}

function watchForEngageLogin() {
  if (!document.querySelector(".login")) {
    return;
  }
  const observer = new MutationObserver(() => {
    if (!document.querySelector(".login")) {
      observer.disconnect();
      location.reload();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/** Wait until Engage shows either the login shell or the main app (`#content`), so we never call `LoadPageElements` while still on login (which would hang on `waitForElm("#content")`). */
function waitForEngageLoginOrContent(): Promise<"login" | "app" | "timeout"> {
  if (document.querySelector(".login")) {
    return Promise.resolve("login");
  }
  if (document.getElementById("content")) {
    return Promise.resolve("app");
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (mode: "login" | "app") => {
      if (settled) return;
      settled = true;
      mo.disconnect();
      window.clearTimeout(tid);
      resolve(mode);
    };
    const check = () => {
      if (document.querySelector(".login")) finish("login");
      else if (document.getElementById("content")) finish("app");
    };
    const mo = new MutationObserver(check);
    mo.observe(document.documentElement, { subtree: true, childList: true });
    const tid = window.setTimeout(() => {
      if (settled) return;
      mo.disconnect();
      settled = true;
      if (document.querySelector(".login")) resolve("login");
      else if (document.getElementById("content")) resolve("app");
      else {
        console.warn(
          "[BetterSEQTA+] Engage: timed out waiting for .login or #content; unblocking load UI.",
        );
        resolve("timeout");
      }
    }, 120_000);
  });
}

export function tryLoad() {
  if (isSeqtaEngageExperience()) {
    updateIframesWithDarkMode();
    window.addEventListener("load", () => removeThemeTagsFromNotices(), {
      once: true,
    });

    const runEngageLoad = async () => {
      const mode = await waitForEngageLoginOrContent();
      if (mode === "login") {
        finishLoad();
        watchForEngageLogin();
        return;
      }
      if (mode === "timeout") {
        finishLoad();
        void waitForElm("#content").then(() => void LoadPageElements());
        return;
      }
      await LoadPageElements();
    };

    if (document.readyState === "complete") {
      void runEngageLoad();
    } else {
      window.addEventListener("load", () => void runEngageLoad(), { once: true });
    }
    return;
  }

  console.log("[BetterSEQTA+] tryLoad() called");
  let loadFinished = false;
  let loadPageElementsCalled = false;

  const finishLoadOnce = () => {
    if (!loadFinished) {
      loadFinished = true;
      finishLoad();
    }
  };

  waitForElm(".login")
    .then(() => {
      finishLoadOnce();
    })
    .catch(() => {});

  waitForElm(".day-container")
    .then(() => {
      finishLoadOnce();
    })
    .catch(() => {});

  waitForElm("[data-key=welcome]")
    .then((elm: any) => {
      elm.classList.remove("active");
    })
    .catch(() => {});

  waitForElm(".code", true, 50)
    .then((elm: any) => {
      if (!elm.innerText.includes("BetterSEQTA") && !loadPageElementsCalled) {
        console.log(
          "[BetterSEQTA+] .code element found, calling LoadPageElements",
        );
        loadPageElementsCalled = true;
        LoadPageElements();
      }
    })
    .catch(() => {
      console.log(
        "[BetterSEQTA+] .code element not found, checking if Teach platform...",
      );
      if (isSeqtaTeachExperience() && !loadPageElementsCalled) {
        console.log(
          "[BetterSEQTA+] Teach platform detected, calling LoadPageElements",
        );
        loadPageElementsCalled = true;
        LoadPageElements().catch((err) => {
          console.error("[BetterSEQTA+] Error loading page elements:", err);
        });
      }
    });

  waitForElm(
    "#main, .legacy-root, main, [class*='Chrome__content'], #root > div > main > header",
    true,
    30,
  )
    .then(() => {
      console.log("[BetterSEQTA+] Main content element found");
      const isTeach = isSeqtaTeachExperience();
      if (isTeach && !loadPageElementsCalled) {
        const codeElement = document.querySelector(".code");
        if (!codeElement) {
          console.log(
            "[BetterSEQTA+] .code still not found, calling LoadPageElements from fallback",
          );
          loadPageElementsCalled = true;
          LoadPageElements().catch((err) => {
            console.error("[BetterSEQTA+] Error loading page elements:", err);
          });
        }
      }
      finishLoadOnce();
    })
    .catch(() => {
      console.log("[BetterSEQTA+] Main content element not found");
    });

  setTimeout(() => {
    if (!loadFinished) {
      finishLoadOnce();
    }
  }, 3000);

  updateIframesWithDarkMode();
  window.addEventListener("load", () => removeThemeTagsFromNotices(), {
    once: true,
  });
}

export function showConflictPopup() {
  if (document.getElementById("conflict-popup")) return;
  document.body.classList.remove("hidden");

  const background = document.createElement("div");
  background.id = "conflict-popup";
  background.classList.add("whatsnewBackground");
  background.style.zIndex = "10000000";

  const container = document.createElement("div");
  container.classList.add("whatsnewContainer");
  container.style.height = "auto";

  const headerHTML = /* html */ `
    <div class="whatsnewHeader">
      <h1>Extension Conflict Detected</h1>
      <p>Legacy BetterSEQTA Installed</p>
    </div>
  `;
  const header = stringToHTML(headerHTML).firstChild;

  const textHTML = /* html */ `
    <div class="whatsnewTextContainer" style="overflow-y: auto; font-size: 1.3rem;">
      <p>
        It appears that you have the legacy BetterSEQTA extension installed alongside BetterSEQTA+.
        This conflict may cause unexpected behavior. (and breaks the extension)
      </p>
      <p>
        Please remove the older BetterSEQTA extension to ensure that BetterSEQTA+ works correctly.
      </p>
    </div>
  `;
  const text = stringToHTML(textHTML).firstChild;

  const exitButton = document.createElement("div");
  exitButton.id = "whatsnewclosebutton";

  if (header) container.append(header);
  if (text) container.append(text);
  container.append(exitButton);

  background.append(container);

  const containerElement = document.getElementById("container") || document.body;
  containerElement.append(background);

  if (settingsState.animations) {
    animate([background as HTMLElement], { opacity: [0, 1] });
  }

  background.addEventListener("click", (event) => {
    if (event.target === background) {
      background.remove();
    }
  });

  exitButton.addEventListener("click", () => {
    background.remove();
  });
}

export function init() {
  const tryMountDisabledUi = async () => {
    if (document.getElementById("AddedSettings")) return;

    try {
      await waitForElm("#content");
    } catch {
      try {
        await waitForElm("#container");
      } catch {
        await waitForElm("body");
      }
    }

    AppendElementsToDisabledPage();
  };

  const handleDisabled = () => {
    void tryMountDisabledUi();
  };

  if (settingsState.onoff) {
    verboseInfo("[BetterSEQTA+] Enabled");
    if (settingsState.DarkMode) document.documentElement.classList.add("dark");
    if (settingsState.iconOnlySidebar) {
      if (document.body) {
        document.body.classList.add("icon-only-sidebar");
      } else {
        document.addEventListener("DOMContentLoaded", () => {
          document.body?.classList.add("icon-only-sidebar");
        });
      }
    }

    document.querySelector(".legacy-root")?.classList.add("hidden");
    void observeMenuItemPosition();

    new StorageChangeHandler();
    new MessageHandler();

    void updateAllColors();
    applySelectedFont();

    window.addEventListener("hashchange", () => {
      if (settingsState.adaptiveThemeColour) void updateAllColors();
    });
    loading();
    InjectCustomIcons();
    applyMenuItemVisibility();
    syncTimetableUrlMonitoring();
    tryLoad();

    // Auto-focus WISP direct online submission editor when pane opens
    eventManager.register(
      "wispassessmentAdded",
      {
        selector: ".uiSlidePane, .wispassessment",
        customCheck: (el) =>
          el.classList.contains("wispassessment") ||
          el.querySelector(".wispassessment") !== null,
      },
      (element) => {
        const wispassessment = element.classList.contains("wispassessment")
          ? (element as Element)
          : element.querySelector(".wispassessment");
        if (!wispassessment) return;

        const focusEditableBody = (iframe: HTMLIFrameElement) => {
          try {
            const doc = iframe.contentDocument;
            const win = iframe.contentWindow;
            if (doc?.body && win) {
              const editable =
                doc.body.querySelector(".cke_editable") || doc.body;
              const el = editable as HTMLElement;
              el.focus();
              const range = doc.createRange();
              range.selectNodeContents(el);
              range.collapse(true);
              const sel = win.getSelection();
              if (sel) {
                sel.removeAllRanges();
                sel.addRange(range);
              }
              return true;
            }
          } catch (_) {}
          return false;
        };

        const focusEditor = () => {
          const iframe = wispassessment.querySelector(".cke_wysiwyg_frame");
          if (iframe instanceof HTMLIFrameElement) {
            if (focusEditableBody(iframe)) return;
            iframe.focus();
            return;
          }
          const ckeditor = (window as any).CKEDITOR;
          if (ckeditor?.instances?.editor1) {
            try {
              ckeditor.instances.editor1.focus();
            } catch (_) {}
          }
        };

        const iframe = wispassessment.querySelector(".cke_wysiwyg_frame");
        if (iframe instanceof HTMLIFrameElement) {
          iframe.addEventListener(
            "load",
            () => focusEditableBody(iframe),
            { once: true },
          );
        }

        [1000, 1200, 1500].forEach((delay) =>
          setTimeout(focusEditor, delay),
        );
      },
    );

    setTimeout(() => {
      const legacyElement = document.querySelector(
        ".outside-container .bottom-container",
      );
      if (legacyElement) {
        verboseLog("Legacy extension detected");
        showConflictPopup();
      }
    }, 1000);
  } else {
    handleDisabled();
    InjectCustomIcons();
    window.addEventListener("load", handleDisabled, { once: true });
  }
}

function InjectCustomIcons() {
  verboseInfo("[BetterSEQTA+] Injecting Icons");

  const style = document.createElement("style");
  style.setAttribute("type", "text/css");
  style.innerHTML = `
    @font-face {
      font-family: 'IconFamily';
      src: url('${resolveExtensionAssetUrl(IconFamily)}') format('woff');
      font-weight: normal;
      font-style: normal;
    }`;
  document.head.appendChild(style);
}

export function AppendElementsToDisabledPage() {
  if (document.getElementById("AddedSettings")) return;

  verboseInfo("[BetterSEQTA+] Appending elements to disabled page");
  AddBetterSEQTAElements();

  let settingsStyle = document.createElement("style");
  settingsStyle.innerHTML = /* css */ `
  .addedButton {
    position: absolute !important;
    right: 50px;
    width: 35px;
    height: 35px;
    padding: 6px !important;
    overflow: unset !important;
    border-radius: 50%;
    margin: 7px !important;
    cursor: pointer;
    color: #38373d !important;
    background: rgba(0, 0, 0, 0.08);
    display: flex !important;
    align-items: center;
    justify-content: center;
    visibility: visible !important;
    z-index: 1000;
  }
  .addedButton svg {
    margin: 6px;
  }
  .outside-container {
    top: 48px !important;
  }
  #ExtensionPopup {
    border-radius: 1rem;
    box-shadow: 0px 0px 20px -2px rgba(0, 0, 0, 0.6);
    transform-origin: 70% 0;
  }
  `;
  document.head.append(settingsStyle);
}
