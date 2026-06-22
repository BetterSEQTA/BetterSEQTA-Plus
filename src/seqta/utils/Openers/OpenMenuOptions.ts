import type { SettingsState } from "@/types/storage";
import { settingsState } from "../listeners/SettingsState";
import { applyMenuItemVisibility } from "../menuItemVisibility";
import { insertKeyAfterInOrder } from "@/seqta/utils/sidebarMenuIcons";
import stringToHTML from "../stringToHTML";
import Sortable from "sortablejs";

export let MenuOptionsOpen = false;

function mergeMenuItemsFromDom(): Record<string, { toggle: boolean }> {
  const menu = document.getElementById("menu");
  const merged = {
    ...(settingsState.menuitems as Record<string, { toggle: boolean }>),
  };
  if (!menu?.firstChild) return merged;

  const children = menu.firstChild.childNodes;
  for (let i = 0; i < children.length; i++) {
    const key = (children[i] as HTMLElement).dataset.key;
    if (key && !merged[key]) {
      merged[key] = { toggle: true };
    }
  }
  return merged;
}

function storeMenuSettings(): void {
  const menuItems: Record<string, { toggle: boolean }> = {};
  const inputs = document.querySelectorAll<HTMLInputElement>(".menuitem");
  for (const input of inputs) {
    if (input.id) {
      menuItems[input.id] = { toggle: input.checked };
    }
  }
  settingsState.menuitems =
    menuItems as SettingsState["menuitems"];
}

export function OpenMenuOptions() {
  var container = document.getElementById("container");
  var menu = document.getElementById("menu");

  if (settingsState.defaultmenuorder.length == 0) {
    let childnodes = menu!.firstChild!.childNodes;
    let newdefaultmenuorder = [];
    for (let i = 0; i < childnodes.length; i++) {
      const element = childnodes[i];
      newdefaultmenuorder.push((element as HTMLElement).dataset.key);
      settingsState.defaultmenuorder = newdefaultmenuorder;
    }
  }
  let childnodes = menu!.firstChild!.childNodes;
  if (settingsState.defaultmenuorder.length != childnodes.length) {
    for (let i = 0; i < childnodes.length; i++) {
      const element = childnodes[i];
      const key = (element as HTMLElement).dataset.key;
      if (
        key &&
        settingsState.defaultmenuorder.indexOf(key) === -1
      ) {
        if (key === "analytics") {
          settingsState.defaultmenuorder = insertKeyAfterInOrder(
            settingsState.defaultmenuorder,
            key,
            "courses",
          );
        } else {
          settingsState.defaultmenuorder = [
            ...settingsState.defaultmenuorder,
            key,
          ];
        }
      }
    }
  }

  MenuOptionsOpen = true;
  menu!.classList.add("bsplus-sidebar-edit-mode");

  var cover = document.createElement("div");
  cover.classList.add("notMenuCover");
  menu!.style.zIndex = "20";
  menu!.style.setProperty("--menuHidden", "flex");
  container!.append(cover);

  var menusettings = document.createElement("div");
  menusettings.classList.add("editmenuoption-container");

  var defaultbutton = document.createElement("div");
  defaultbutton.classList.add("editmenuoption");
  defaultbutton.innerText = "Restore Default";
  defaultbutton.id = "restoredefaultoption";

  var savebutton = document.createElement("div");
  savebutton.classList.add("editmenuoption");
  savebutton.innerText = "Save";
  savebutton.id = "savemenuoption";

  menusettings.appendChild(defaultbutton);
  menusettings.appendChild(savebutton);

  menu!.appendChild(menusettings);

  var ListItems = menu!.firstChild!.childNodes;
  for (let i = 0; i < ListItems.length; i++) {
    const element1 = ListItems[i];
    const element = element1 as HTMLElement;

    (element as HTMLElement).classList.add("draggable");
    if ((element as HTMLElement).classList.contains("hasChildren")) {
      (element as HTMLElement).classList.remove("active");
      (element.firstChild as HTMLElement).classList.remove("noscroll");
    }

    let MenuItemToggle = stringToHTML(
      `<div class="onoffswitch" style="margin: auto 0;"><input class="onoffswitch-checkbox notification menuitem" type="checkbox" id="${(element as HTMLElement).dataset.key}"><label for="${(element as HTMLElement).dataset.key}" class="onoffswitch-label"></label>`,
    ).firstChild;
    (element as HTMLElement).append(MenuItemToggle!);

    if (!element.dataset.betterseqta) {
      const a = document.createElement("section");
      a.innerHTML = element.innerHTML;
      cloneAttributes(a, element);
      menu!.firstChild!.insertBefore(a, element);
      element.remove();
    }
  }

  if (Object.keys(settingsState.menuitems).length == 0) {
    settingsState.menuitems = mergeMenuItemsFromDom() as SettingsState["menuitems"];
  } else {
    settingsState.menuitems = mergeMenuItemsFromDom() as SettingsState["menuitems"];
  }

  let menuItems = settingsState.menuitems as Record<string, { toggle: boolean }>;
  let buttons = document.getElementsByClassName("menuitem");
  for (let i = 0; i < buttons.length; i++) {
    const input = buttons[i] as HTMLInputElement;
    const id = input.id;
    input.checked =
      id && menuItems[id] ? menuItems[id].toggle : true;
  }

  let sortable: Sortable | undefined;
  try {
    var el = document.querySelector("#menu > ul");
    sortable = Sortable.create(el as HTMLElement, {
      draggable: ".draggable",
      dataIdAttr: "data-key",
      animation: 150,
      easing: "cubic-bezier(.5,0,.5,1)",
      onEnd: function () {
        saveNewOrder(sortable!);
      },
    });
  } catch (err) {
    console.error(err);
  }

  function changeDisplayProperty(input: HTMLInputElement) {
    const row = input.closest("li, section") as HTMLElement | null;
    if (!row) return;
    if (!input.checked) {
      row.style.display = "var(--menuHidden)";
    } else {
      row.style.setProperty("display", "flex", "important");
    }
  }

  const menuInputs = document.querySelectorAll<HTMLInputElement>(".menuitem");
  for (const input of menuInputs) {
    input.addEventListener("change", () => {
      storeMenuSettings();
      changeDisplayProperty(input);
    });
  }

  function closeAll() {
    menusettings?.remove();
    cover?.remove();
    MenuOptionsOpen = false;
    menu!.classList.remove("bsplus-sidebar-edit-mode");
    menu!.style.setProperty("--menuHidden", "none");

    for (let i = 0; i < ListItems.length; i++) {
      const element1 = ListItems[i];
      const element = element1 as HTMLElement;
      element.classList.remove("draggable");
      element.setAttribute("draggable", "false");

      if (!element.dataset.betterseqta) {
        const a = document.createElement("li");
        a.innerHTML = element.innerHTML;
        cloneAttributes(a, element);
        menu!.firstChild!.insertBefore(a, element);
        element.remove();
      }
    }

    let switches = menu!.querySelectorAll(".onoffswitch");
    for (let i = 0; i < switches.length; i++) {
      switches[i].remove();
    }

    applyMenuItemVisibility();
  }

  function saveAndClose() {
    storeMenuSettings();
    if (sortable) {
      saveNewOrder(sortable);
    }
    applyMenuItemVisibility();
    closeAll();
  }

  cover?.addEventListener("click", closeAll);
  savebutton?.addEventListener("click", saveAndClose);

  defaultbutton?.addEventListener("click", function () {
    const options = settingsState.defaultmenuorder;
    settingsState.menuorder = options;

    ChangeMenuItemPositions(options);

    const inputs = document.querySelectorAll<HTMLInputElement>(".menuitem");
    const restored: Record<string, { toggle: boolean }> = {};
    for (const input of inputs) {
      input.checked = true;
      const row = input.closest("li, section") as HTMLElement | null;
      if (row) {
        row.style.setProperty("display", "flex", "important");
      }
      if (input.id) {
        restored[input.id] = { toggle: true };
      }
    }
    settingsState.menuitems = restored as SettingsState["menuitems"];

    if (sortable) {
      saveNewOrder(sortable);
    }
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
