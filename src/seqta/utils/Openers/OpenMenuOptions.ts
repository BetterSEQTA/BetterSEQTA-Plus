import type { SettingsState } from "@/types/storage";
import { settingsState } from "../listeners/SettingsState";
import stringToHTML from "../stringToHTML";
import Sortable from "sortablejs";

export let MenuOptionsOpen = false;

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
      if (
        !settingsState.defaultmenuorder.indexOf(
          (element as HTMLElement).dataset.key,
        )
      ) {
        let newdefaultmenuorder = settingsState.defaultmenuorder;
        newdefaultmenuorder.push((element as HTMLElement).dataset.key);
        settingsState.defaultmenuorder = newdefaultmenuorder;
      }
    }
  }

  MenuOptionsOpen = true;

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
  savebutton.id = "restoredefaultoption";

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
    menubuttons = menu!.firstChild!.childNodes;
    let menuItems = {} as any;
    for (var i = 0; i < menubuttons.length; i++) {
      var id = (menubuttons[i] as HTMLElement).dataset.key;
      const element: any = {};
      element.toggle = true;
      (menuItems[id as keyof typeof menuItems] as any) = element;
    }
    settingsState.menuitems = menuItems;
  }

  var menubuttons: any = document.getElementsByClassName("menuitem");

  let menuItems = settingsState.menuitems as any;
  let buttons = document.getElementsByClassName("menuitem");
  for (let i = 0; i < buttons.length; i++) {
    let id = buttons[i].id as string | undefined;
    if (menuItems[id as keyof typeof menuItems]) {
      (buttons[i] as HTMLInputElement).checked =
        menuItems[id as keyof typeof menuItems].toggle;
    } else {
      (buttons[i] as HTMLInputElement).checked = true;
    }
    (buttons[i] as HTMLInputElement).checked = true;
  }

  try {
    var el = document.querySelector("#menu > ul");
    var sortable = Sortable.create(el as HTMLElement, {
      draggable: ".draggable",
      dataIdAttr: "data-key",
      animation: 150,
      easing: "cubic-bezier(.5,0,.5,1)",
      onEnd: function () {
        saveNewOrder(sortable);
      },
    });
  } catch (err) {
    console.error(err);
  }

  function changeDisplayProperty(element: any) {
    if (!element.checked) {
      element.parentNode.parentNode.style.display = "var(--menuHidden)";
    }
    if (element.checked) {
      element.parentNode.parentNode.style.setProperty(
        "display",
        "flex",
        "important",
      );
    }
  }

  function StoreMenuSettings() {
    let menu = document.getElementById("menu");
    const menuItems: any = {};
    let menubuttons = menu!.firstChild!.childNodes;
    const button = document.getElementsByClassName("menuitem");
    for (let i = 0; i < menubuttons.length; i++) {
      const id = (menubuttons[i] as HTMLElement).dataset.key;
      const element: any = {};
      element.toggle = (button[i] as HTMLInputElement).checked;

      menuItems[id as keyof typeof menuItems] = element;
    }
    settingsState.menuitems = menuItems;
  }

  for (let i = 0; i < menubuttons.length; i++) {
    const element = menubuttons[i];
    element.addEventListener("change", () => {
      element.parentElement.parentElement.getAttribute("data-key");
      StoreMenuSettings();
      changeDisplayProperty(element);
    });
  }

  function closeAll() {
    menusettings?.remove();
    cover?.remove();
    MenuOptionsOpen = false;
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
  }

  cover?.addEventListener("click", closeAll);
  savebutton?.addEventListener("click", closeAll);

  defaultbutton?.addEventListener("click", function () {
    const options = settingsState.defaultmenuorder;
    settingsState.menuorder = options;

    ChangeMenuItemPositions(options);

    for (let i = 0; i < menubuttons.length; i++) {
      const element = menubuttons[i];
      element.checked = true;
      element.parentNode.parentNode.style.setProperty(
        "display",
        "flex",
        "important",
      );
    }
    saveNewOrder(sortable);
  });
}

function saveNewOrder(sortable: any) {
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
    newArr[listorder[i]] = menuList[i];
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
