import type { SettingsState } from "@/types/storage";
import { settingsState } from "../listeners/SettingsState";
import { applyMenuItemVisibility } from "../menuItemVisibility";
import { ensureAnalyticsMenuOrder } from "@/seqta/utils/sidebarMenuIcons";
import stringToHTML from "../stringToHTML";
import Sortable from "sortablejs";

export let MenuOptionsOpen = false;

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function syncDefaultMenuOrder(menu: HTMLElement) {
  const childnodes = menu.firstChild!.childNodes;
  if (settingsState.defaultmenuorder.length === 0) {
    settingsState.defaultmenuorder = Array.from(childnodes).map(
      (element) => (element as HTMLElement).dataset.key,
    );
    return;
  }

  if (settingsState.defaultmenuorder.length === childnodes.length) return;

  for (let i = 0; i < childnodes.length; i++) {
    const key = (childnodes[i] as HTMLElement).dataset.key;
    if (key && settingsState.defaultmenuorder.indexOf(key) === -1) {
      settingsState.defaultmenuorder = [...settingsState.defaultmenuorder, key];
    }
  }
  ensureAnalyticsMenuOrder();
}

function mergeMenuItemsFromDom(
  menu: HTMLElement,
): Record<string, { toggle: boolean }> {
  const merged = {
    ...(settingsState.menuitems as Record<string, { toggle: boolean }>),
  };
  const children = menu.firstChild!.childNodes;
  for (let i = 0; i < children.length; i++) {
    const key = (children[i] as HTMLElement).dataset.key;
    if (key && !merged[key]) {
      merged[key] = { toggle: true };
    }
  }
  return merged;
}

function createMenuEditControls(menu: HTMLElement, container: HTMLElement) {
  const cover = document.createElement("div");
  cover.classList.add("notMenuCover");
  menu.style.zIndex = "20";
  menu.style.setProperty("--menuHidden", "flex");
  container.append(cover);

  const menusettings = document.createElement("div");
  menusettings.classList.add("editmenuoption-container");

  const defaultbutton = document.createElement("div");
  defaultbutton.classList.add("editmenuoption");
  defaultbutton.innerText = "Restore Default";
  defaultbutton.id = "restoredefaultoption";

  const savebutton = document.createElement("div");
  savebutton.classList.add("editmenuoption");
  savebutton.innerText = "Save";
  savebutton.id = "savemenuoption";

  menusettings.appendChild(defaultbutton);
  menusettings.appendChild(savebutton);
  menu.appendChild(menusettings);

  return { cover, menusettings, defaultbutton, savebutton };
}

function prepareMenuItemsForEdit(menu: HTMLElement) {
  const listItems = menu.firstChild!.childNodes;
  for (let i = 0; i < listItems.length; i++) {
    const element = listItems[i] as HTMLElement;
    element.classList.add("draggable");
    if (element.classList.contains("hasChildren")) {
      element.classList.remove("active");
      (element.firstChild as HTMLElement).classList.remove("noscroll");
    }

    const menuKey = escapeHtmlAttr(element.dataset.key ?? "");
    const menuItemToggle = stringToHTML(
      `<div class="onoffswitch" style="margin: auto 0;"><input class="onoffswitch-checkbox notification menuitem" type="checkbox" id="${menuKey}"><label for="${menuKey}" class="onoffswitch-label"></label>`,
    ).firstChild;
    element.append(menuItemToggle!);

    if (element.dataset.betterseqta) continue;

    const section = document.createElement("section");
    cloneAttributes(section, element);
    while (element.firstChild) section.appendChild(element.firstChild);
    menu.firstChild!.insertBefore(section, element);
    element.remove();
  }
  return listItems;
}

function syncMenuItemSettings(menu: HTMLElement) {
  settingsState.menuitems = mergeMenuItemsFromDom(
    menu,
  ) as SettingsState["menuitems"];
}

function applySavedMenuToggleStates() {
  const menuItems = settingsState.menuitems as Record<
    string,
    { toggle: boolean }
  >;
  const buttons = document.getElementsByClassName("menuitem");
  for (let i = 0; i < buttons.length; i++) {
    const id = buttons[i].id;
    (buttons[i] as HTMLInputElement).checked = id
      ? (menuItems[id]?.toggle ?? true)
      : true;
  }
}

function createMenuSortable(): Sortable | undefined {
  try {
    const el = document.querySelector("#menu > ul");
    if (!el) return undefined;
    let sortable: Sortable | undefined;
    sortable = Sortable.create(el as HTMLElement, {
      draggable: ".draggable",
      dataIdAttr: "data-key",
      animation: 150,
      easing: "cubic-bezier(.5,0,.5,1)",
      onEnd: () => saveNewOrder(sortable),
    });
    return sortable;
  } catch (err) {
    console.error(err);
    return undefined;
  }
}

function changeMenuItemDisplay(element: HTMLInputElement) {
  const row = element.closest("li, section") as HTMLElement | null;
  if (!row) return;
  if (!element.checked) {
    row.style.display = "var(--menuHidden)";
    return;
  }
  row.style.setProperty("display", "flex", "important");
}

function storeMenuSettings() {
  const menuItems: Record<string, { toggle: boolean }> = {
    ...(settingsState.menuitems as Record<string, { toggle: boolean }>),
  };
  const inputs = document.querySelectorAll<HTMLInputElement>(".menuitem");
  for (const input of inputs) {
    if (input.id) {
      menuItems[input.id] = { toggle: input.checked };
    }
  }
  settingsState.menuitems = menuItems as SettingsState["menuitems"];
}

function restoreMenuItemsFromEditMode(
  menu: HTMLElement,
  listItems: NodeListOf<ChildNode>,
) {
  for (let i = 0; i < listItems.length; i++) {
    const element = listItems[i] as HTMLElement;
    element.classList.remove("draggable");
    element.setAttribute("draggable", "false");

    if (element.dataset.betterseqta) continue;

    const listItem = document.createElement("li");
    cloneAttributes(listItem, element);
    while (element.firstChild) listItem.appendChild(element.firstChild);
    menu.firstChild!.insertBefore(listItem, element);
    element.remove();
  }

  menu.querySelectorAll(".onoffswitch").forEach((toggle) => toggle.remove());
}

export function OpenMenuOptions() {
  if (MenuOptionsOpen) return;

  const container = document.getElementById("container");
  const menu = document.getElementById("menu");
  if (!container || !menu) return;

  syncDefaultMenuOrder(menu);
  MenuOptionsOpen = true;
  menu.classList.add("bsplus-sidebar-edit-mode");

  const { cover, menusettings, defaultbutton, savebutton } =
    createMenuEditControls(menu, container);
  const listItems = prepareMenuItemsForEdit(menu);
  syncMenuItemSettings(menu);
  applySavedMenuToggleStates();

  const menubuttons = document.getElementsByClassName("menuitem");
  const sortable = createMenuSortable();

  for (let i = 0; i < menubuttons.length; i++) {
    const element = menubuttons[i] as HTMLInputElement;
    element.addEventListener("change", () => {
      storeMenuSettings();
      changeMenuItemDisplay(element);
    });
  }

  const closeAll = () => {
    menusettings.remove();
    cover.remove();
    MenuOptionsOpen = false;
    menu.classList.remove("bsplus-sidebar-edit-mode");
    menu.style.setProperty("--menuHidden", "none");
    restoreMenuItemsFromEditMode(menu, listItems);
    applyMenuItemVisibility();
  };

  const saveAndClose = () => {
    storeMenuSettings();
    if (sortable) {
      saveNewOrder(sortable);
    }
    closeAll();
  };

  cover.addEventListener("click", closeAll);
  savebutton.addEventListener("click", saveAndClose);

  defaultbutton.addEventListener("click", () => {
    settingsState.menuorder = settingsState.defaultmenuorder;
    ChangeMenuItemPositions(settingsState.defaultmenuorder);

    const restored: Record<string, { toggle: boolean }> = {};
    for (let i = 0; i < menubuttons.length; i++) {
      const element = menubuttons[i] as HTMLInputElement;
      element.checked = true;
      changeMenuItemDisplay(element);
      if (element.id) {
        restored[element.id] = { toggle: true };
      }
    }
    settingsState.menuitems = restored as SettingsState["menuitems"];

    if (sortable) saveNewOrder(sortable);
  });
}

function saveNewOrder(sortable: Sortable) {
  var order = sortable.toArray();
  settingsState.menuorder = order;
}

function cloneAttributes(target: any, source: any) {
  [...source.attributes].forEach((attr) => {
    target.setAttribute(attr.nodeName, attr.nodeValue);
  });
}

export function ChangeMenuItemPositions(menuorder: SettingsState["menuorder"]) {
  var menuList = document.querySelector("#menu")!.firstChild!.childNodes;

  let listorder = [];
  for (let i = 0; i < menuList.length; i++) {
    const menu = menuList[i] as HTMLElement;

    let a = menuorder.indexOf(menu.dataset.key);

    listorder.push(a);
  }

  var newArr = [];
  for (var i = 0; i < listorder.length; i++) {
    const index = listorder[i];
    if (index >= 0) {
      newArr[index] = menuList[i];
    }
  }

  let listItemsDOM = document.getElementById("menu")!.firstChild;
  for (let i = 0; i < newArr.length; i++) {
    const element = newArr[i];
    if (element) {
      const elem = element as HTMLElement;
      elem.setAttribute("data-checked", "true");
      listItemsDOM!.appendChild(element);
    }
  }
}
