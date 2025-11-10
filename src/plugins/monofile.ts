// Third-party libraries
import browser from "webextension-polyfill";
import { animate, stagger } from "motion";

// Internal utilities and functions
import {
  ChangeMenuItemPositions,
  MenuOptionsOpen,
} from "@/seqta/utils/Openers/OpenMenuOptions";
import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { delay } from "@/seqta/utils/delay";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { MessageHandler } from "@/seqta/utils/listeners/MessageListener";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { StorageChangeHandler } from "@/seqta/utils/listeners/StorageChanges";
import { eventManager } from "@/seqta/utils/listeners/EventManager";

// UI and theme management
import RegisterClickListeners from "@/seqta/utils/listeners/ClickListeners";
import { AddBetterSEQTAElements } from "@/seqta/ui/AddBetterSEQTAElements";
import { updateAllColors } from "@/seqta/ui/colors/Manager";
import loading from "@/seqta/ui/Loading";
import { SendNewsPage } from "@/seqta/utils/SendNewsPage";
import { loadHomePage } from "@/seqta/utils/Loaders/LoadHomePage";
import { OpenWhatsNewPopup } from "@/seqta/utils/Openers/OpenWhatsNewPopup";
//import { OpenMinecraftServerPopup } from "@/seqta/utils/Openers/OpenMinecraftServerPopup";

import {
  updateTimetableTimes,
} from "@/seqta/utils/updateTimetableTimes";

// JSON content
import MenuitemSVGKey from "@/seqta/content/MenuItemSVGKey.json";

// Icons and fonts
import IconFamily from "@/resources/fonts/IconFamily.woff";

// Stylesheets
import iframeCSS from "@/css/iframe.scss?raw";

function SetDisplayNone(ElementName: string) {
  return `li[data-key=${ElementName}]{display:var(--menuHidden) !important; transition: 1s;}`;
}

async function HideMenuItems(): Promise<void> {
  try {
    let stylesheetInnerText: string = "";
    for (const [menuItem, { toggle }] of Object.entries(
      settingsState.menuitems,
    )) {
      if (!toggle) {
        stylesheetInnerText += SetDisplayNone(menuItem);
        console.info(`[BetterSEQTA+] Hiding ${menuItem} menu item`);
      }
    }

    const menuItemStyle: HTMLStyleElement = document.createElement("style");
    menuItemStyle.innerText = stylesheetInnerText;
    document.head.appendChild(menuItemStyle);
  } catch (error) {
    console.error("[BetterSEQTA+] An error occurred:", error);
  }
}

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

export async function finishLoad() {
  try {
    document.querySelector(".legacy-root")?.classList.remove("hidden");

    const loadingbk = document.getElementById("loading");
    loadingbk?.classList.add("closeLoading");
    await delay(501);
    loadingbk?.remove();
  } catch (err) {
    console.error("Error during loading cleanup:", err);
  }

  if (settingsState.justupdated && !document.getElementById("whatsnewbk")) {
    OpenWhatsNewPopup();
  }
}

export function GetCSSElement(file: string) {
  const cssFile = browser.runtime.getURL(file);
  const fileref = document.createElement("link");
  fileref.setAttribute("rel", "stylesheet");
  fileref.setAttribute("type", "text/css");
  fileref.setAttribute("href", cssFile);

  return fileref;
}

function removeThemeTagsFromNotices() {
  // Grabs an array of the notice iFrames
  const userHTMLArray = document.getElementsByClassName("userHTML");
  // Iterates through the array, applying the iFrame css
  for (const item of userHTMLArray) {
    // Grabs the HTML of the body tag
    const item1 = item as HTMLIFrameElement;
    const body = item1.contentWindow!.document.querySelectorAll("body")[0];
    if (body) {
      // Replaces the theme tag with nothing
      const bodyText = body.innerHTML;
      body.innerHTML = bodyText
        .replace(/\[\[[\w]+[:][\w]+[\]\]]+/g, "")
        .replace(/ +/, " ");
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
      elementType: "iframe",
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
  if (head && !head.innerHTML.includes("iframecss")) {
    head.innerHTML += cssLink.outerHTML;
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
  await AddBetterSEQTAElements();
  const sublink: string | undefined = window.location.href.split("/")[4];

  eventManager.register(
    "messagesAdded",
    {
      elementType: "div",
      className: "messages",
    },
    handleMessages,
  );

  eventManager.register(
    "noticesAdded",
    {
      elementType: "div",
      className: "notices",
    },
    CheckNoticeTextColour,
  );

  eventManager.register(
    "dashboardAdded",
    {
      elementType: "div",
      className: "dashboard",
    },
    handleDashboard,
  );

  eventManager.register(
    "documentsAdded",
    {
      elementType: "div",
      className: "documents",
    },
    handleDocuments,
  );

  eventManager.register(
    "reportsAdded",
    {
      elementType: "div",
      className: "reports",
    },
    handleReports,
  );

  eventManager.register(
    "timetableAdded",
    {
      elementType: "div",
      className: "timetablepage",
    },
    async () => {
      await updateTimetableTimes();
    },
  );

  eventManager.register(
    "noticesAdded",
    {
      elementType: "div",
      className: "notice",
    },
    handleNotices,
  );

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
  switch (sublink) {
    case "news":
      await handleNewsPage();
      break;
    case undefined:
      window.location.replace(
        `${location.origin}/#?page=/${settingsState.defaultPage}`,
      );
      if (settingsState.defaultPage === "home") loadHomePage();
      if (settingsState.defaultPage === "documents")
        handleDocuments(document.querySelector(".documents")!);
      if (settingsState.defaultPage === "reports")
        handleReports(document.querySelector(".reports")!);
      if (settingsState.defaultPage === "messages")
        handleMessages(document.querySelector(".messages")!);

      finishLoad();
      break;
    case "home":
      window.location.replace(`${location.origin}/#?page=/home`);
      console.info("[BetterSEQTA+] Started Init");
      if (settingsState.onoff) loadHomePage();
      finishLoad();
      break;

    default:
      await handleDefault();
      break;
  }
}

async function handleNewsPage(): Promise<void> {
  console.info("[BetterSEQTA+] Started Init");
  if (settingsState.onoff) {
    SendNewsPage();
    finishLoad();
  }
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
  animate(
    ".dashboard > *",
    { opacity: [0, 1], y: [10, 0] },
    {
      delay: stagger(0.1),
      duration: 0.5,
      ease: [0.22, 0.03, 0.26, 1],
    },
  );

  document.head.querySelector("style.dashboardHider")?.remove();
}

async function handleDocuments(node: Element): Promise<void> {
  if (!(node instanceof HTMLElement)) return;
  if (!settingsState.animations) return;

  await waitForElm(".document", true, 10);
  animate(
    ".documents tbody tr.document",
    { opacity: [0, 1], y: [10, 0] },
    {
      delay: stagger(0.05),
      duration: 0.5,
      ease: [0.22, 0.03, 0.26, 1],
    },
  );
}

async function handleReports(node: Element): Promise<void> {
  if (!(node instanceof HTMLElement)) return;
  if (!settingsState.animations) return;

  await waitForElm(".report", true, 10);
  animate(
    ".reports .item",
    { opacity: [0, 1], y: [10, 0] },
    {
      delay: stagger(0.05, { startDelay: 0.2 }),
      duration: 0.5,
      ease: [0.22, 0.03, 0.26, 1],
    },
  );
}

function CheckNoticeTextColour(notice: any) {
  eventManager.register(
    "noticeAdded",
    {
      elementType: "div",
      className: "notice",
      parentElement: notice,
    },
    (node) => {
      var hex = (node as HTMLElement).style.cssText.split(" ")[1];
      if (hex) {
        const hex1 = hex.slice(0, -1);
        var threshold = GetThresholdOfColor(hex1);
        if (settingsState.DarkMode && threshold < 100) {
          (node as HTMLElement).style.cssText = "--color: undefined;";
        }
      }
    },
  );
}

export function tryLoad() {
  waitForElm(".login").then(() => {
    finishLoad();
  });

  waitForElm(".day-container").then(() => {
    finishLoad();
  });

  waitForElm("[data-key=welcome]").then((elm: any) => {
    elm.classList.remove("active");
  });

  waitForElm(".code", true, 50).then((elm: any) => {
    if (!elm.innerText.includes("BetterSEQTA")) LoadPageElements();
  });

  updateIframesWithDarkMode();
  // Waits for page to call on load, run scripts
  document.addEventListener(
    "load",
    function () {
      removeThemeTagsFromNotices();
    },
    true,
  );
}

function ReplaceMenuSVG(element: HTMLElement, svg: string) {
  let item = element.firstChild as HTMLElement;
  item!.firstChild!.remove();

  item.innerHTML = `<span>${item.innerHTML}</span>`;

  let newsvg = stringToHTML(svg).firstChild;
  item.insertBefore(newsvg as Node, item.firstChild);
}

const processedSymbol = Symbol("processed");

export async function ObserveMenuItemPosition() {
  await waitForElm("#menu > ul > li");

  eventManager.register(
    "menuList",
    {
      parentElement: document.querySelector("#menu")!.firstChild as Element,
    },
    (element: Element) => {
      const node = element as HTMLElement;

      // Only process top-level menu items and skip everything else
      if (
        !node.classList.contains("item") ||
        node.nodeName !== "LI" ||
        node.parentElement?.parentElement?.id !== "menu"
      ) {
        return;
      }

      // Early exit if already processed
      if ((element as any)[processedSymbol]) {
        return;
      }

      if (!MenuOptionsOpen) {
        const key =
          MenuitemSVGKey[node?.dataset?.key! as keyof typeof MenuitemSVGKey];
        if (key) {
          ReplaceMenuSVG(
            node,
            MenuitemSVGKey[node.dataset.key as keyof typeof MenuitemSVGKey],
          );
        } else if (node?.firstChild?.nodeName === "LABEL") {
          const label = node.firstChild as HTMLElement;
          let textNode = label.lastChild as HTMLElement;

          if (
            textNode.nodeType === 3 &&
            textNode.parentNode &&
            textNode.parentNode.nodeName !== "SPAN"
          ) {
            const span = document.createElement("span");
            span.textContent = textNode.nodeValue;

            label.replaceChild(span, textNode);
          }
        }
        ChangeMenuItemPositions(settingsState.menuorder);

        (element as any)[processedSymbol] = true;
      }
    },
  );
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

  document.getElementById("container")?.append(background);

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
  const handleDisabled = () => {
    waitForElm(".code", true, 50).then(AppendElementsToDisabledPage);
  };

  if (settingsState.onoff) {
    console.info("[BetterSEQTA+] Enabled");
    if (settingsState.DarkMode) document.documentElement.classList.add("dark");

    document.querySelector(".legacy-root")?.classList.add("hidden");
    ObserveMenuItemPosition();

    new StorageChangeHandler();
    new MessageHandler();

    updateAllColors();
    loading();
    InjectCustomIcons();
    HideMenuItems();
    tryLoad();

    setTimeout(() => {
      const legacyElement = document.querySelector(
        ".outside-container .bottom-container",
      );
      if (legacyElement) {
        console.log("Legacy extension detected");
        showConflictPopup();
      }
    }, 1000);
  } else {
    handleDisabled();
    InjectCustomIcons();
    window.addEventListener("load", handleDisabled);
  }
}

function InjectCustomIcons() {
  console.info("[BetterSEQTA+] Injecting Icons");

  const style = document.createElement("style");
  style.setAttribute("type", "text/css");
  style.innerHTML = `
    @font-face {
      font-family: 'IconFamily';
      src: url('${browser.runtime.getURL(IconFamily)}') format('woff');
      font-weight: normal;
      font-style: normal;
    }`;
  document.head.appendChild(style);
}

export function AppendElementsToDisabledPage() {
  console.info("[BetterSEQTA+] Appending elements to disabled page");
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
    color: white !important;
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
