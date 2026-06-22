import MenuitemSVGKey from "@/seqta/content/MenuItemSVGKey.json";
import {
  ChangeMenuItemPositions,
  MenuOptionsOpen,
} from "@/seqta/utils/Openers/OpenMenuOptions";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { waitForEngageMenuList } from "@/seqta/utils/waitForEngageMenuList";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { eventManager } from "@/seqta/utils/listeners/EventManager";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";

const BETTERSEQTA_ICON_ATTR = "data-betterseqta-icon";

export function insertMenuItemAfterKey(
  menuList: HTMLElement,
  item: HTMLElement,
  afterKey: string,
): void {
  const after = menuList.querySelector(
    `:scope > li[data-key="${afterKey}"], :scope > section[data-key="${afterKey}"]`,
  );
  if (after instanceof HTMLElement) {
    after.insertAdjacentElement("afterend", item);
  } else {
    menuList.appendChild(item);
  }
}

export function insertKeyAfterInOrder(
  order: string[],
  key: string,
  afterKey: string,
): string[] {
  if (order.includes(key)) return order;
  const copy = [...order];
  const afterIdx = copy.indexOf(afterKey);
  if (afterIdx >= 0) {
    copy.splice(afterIdx + 1, 0, key);
  } else {
    copy.push(key);
  }
  return copy;
}

/** Default Analytics immediately below Courses in saved menu order. */
export function ensureAnalyticsMenuOrder(): void {
  if (!settingsState.defaultmenuorder.includes("analytics")) {
    settingsState.defaultmenuorder = insertKeyAfterInOrder(
      settingsState.defaultmenuorder,
      "analytics",
      "courses",
    );
  }
  if (
    settingsState.menuorder.length > 0 &&
    !settingsState.menuorder.includes("analytics")
  ) {
    settingsState.menuorder = insertKeyAfterInOrder(
      settingsState.menuorder,
      "analytics",
      "courses",
    );
  }
}

function getMenuLabel(element: HTMLElement): HTMLElement | null {
  const label = element.querySelector(":scope > label");
  return label instanceof HTMLElement ? label : null;
}

function getTopLevelMenuList(menu = document.getElementById("menu")): HTMLElement | null {
  if (!menu) return null;
  return (
    (menu.querySelector(":scope > ul") as HTMLElement | null) ??
    (menu.querySelector("ul") as HTMLElement | null)
  );
}

export function isTopLevelSidebarItem(node: HTMLElement): boolean {
  if (!node.classList.contains("item")) return false;
  if (node.nodeName !== "LI" && node.nodeName !== "SECTION") return false;

  const topList = getTopLevelMenuList();
  return !!topList && node.parentElement === topList;
}

function wrapMenuLabelText(label: HTMLElement) {
  const textNode = label.lastChild;
  if (
    textNode?.nodeType === 3 &&
    textNode.parentNode &&
    textNode.parentNode.nodeName !== "SPAN"
  ) {
    const span = document.createElement("span");
    span.textContent = textNode.nodeValue;
    label.replaceChild(span, textNode);
  }
}

export function replaceMenuSVG(element: HTMLElement, svg: string) {
  const label = getMenuLabel(element);
  if (!label?.firstChild) return;

  if (label.firstElementChild?.getAttribute(BETTERSEQTA_ICON_ATTR) === "true") {
    return;
  }

  label.firstChild.remove();
  label.innerHTML = `<span>${label.innerHTML}</span>`;

  const newSvg = stringToHTML(svg).firstChild;
  if (!(newSvg instanceof Element)) return;

  newSvg.setAttribute(BETTERSEQTA_ICON_ATTR, "true");
  label.insertBefore(newSvg, label.firstChild);
}

export function processMenuItemNode(node: HTMLElement) {
  if (!isTopLevelSidebarItem(node) || MenuOptionsOpen) return;

  const key = node.dataset.key as keyof typeof MenuitemSVGKey | undefined;
  if (key && MenuitemSVGKey[key]) {
    replaceMenuSVG(node, MenuitemSVGKey[key]);
  } else {
    const label = getMenuLabel(node);
    if (label) wrapMenuLabelText(label);
  }
}

function processTopLevelMenuItems(reorder = !isSeqtaEngageExperience()) {
  if (MenuOptionsOpen) return;

  const topList = getTopLevelMenuList();
  if (!topList) return;

  for (const child of topList.children) {
    if (child instanceof HTMLElement) {
      processMenuItemNode(child);
    }
  }

  if (reorder) {
    ChangeMenuItemPositions(settingsState.menuorder);
  }
}

let engageMenuIconObserver: MutationObserver | null = null;
let engageMenuIconFrame: number | null = null;

function scheduleEngageMenuIconPass() {
  if (engageMenuIconFrame !== null) return;

  engageMenuIconFrame = window.requestAnimationFrame(() => {
    engageMenuIconFrame = null;
    processTopLevelMenuItems(false);
  });
}

async function observeEngageMenuIcons() {
  const menuList = await waitForEngageMenuList();
  const menu = document.getElementById("menu");
  if (!menu || !menuList) return;

  processTopLevelMenuItems(false);

  engageMenuIconObserver?.disconnect();
  engageMenuIconObserver = new MutationObserver(() => {
    scheduleEngageMenuIconPass();
  });
  engageMenuIconObserver.observe(menu, {
    childList: true,
    subtree: true,
  });
}

const processedSymbol = Symbol("processed");

export async function observeMenuItemPosition() {
  if (isSeqtaEngageExperience()) {
    await observeEngageMenuIcons();
    return;
  }

  await waitForElm("#menu > ul > li");

  eventManager.register(
    "menuList",
    {
      parentElement: document.querySelector("#menu")!.firstChild as Element,
    },
    (element: Element) => {
      const node = element as HTMLElement;

      if (!isTopLevelSidebarItem(node)) return;
      if ((element as any)[processedSymbol]) return;

      if (!MenuOptionsOpen) {
        processMenuItemNode(node);
        ChangeMenuItemPositions(settingsState.menuorder);
        (element as any)[processedSymbol] = true;
      }
    },
  );
}
