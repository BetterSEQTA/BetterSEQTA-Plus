// Import necessary modules and functions
import type { SettingsState } from "@/types/storage"; // Import type for SettingsState
import { settingsState } from "../listeners/SettingsState"; // Manages the application's settings state
import stringToHTML from "../stringToHTML"; // Converts strings to HTML elements
import Sortable from "sortablejs"; // Library for creating sortable lists

// Global variable to track if the menu options are open
export let MenuOptionsOpen = false;

// Function to open the menu options and configure the menu layout
export function OpenMenuOptions() {
  var container = document.getElementById("container"); // Get the container element
  var menu = document.getElementById("menu"); // Get the menu element

  // Initialize default menu order if it is not set
  if (settingsState.defaultmenuorder.length == 0) {
    let childnodes = menu!.firstChild!.childNodes;
    let newdefaultmenuorder = [];
    for (let i = 0; i < childnodes.length; i++) {
      const element = childnodes[i];
      newdefaultmenuorder.push((element as HTMLElement).dataset.key);
      settingsState.defaultmenuorder = newdefaultmenuorder;
    }
  }

  // Update default menu order if it is different from the current child nodes
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

  // Mark that the menu options are now open
  MenuOptionsOpen = true;

  // Create a cover element to overlay the menu
  var cover = document.createElement("div");
  cover.classList.add("notMenuCover"); // Add class for styling
  menu!.style.zIndex = "20"; // Set the z-index of the menu
  menu!.style.setProperty("--menuHidden", "flex"); // Set menu visibility
  container!.append(cover); // Append the cover to the container

  // Create a container for the menu settings (edit options)
  var menusettings = document.createElement("div");
  menusettings.classList.add("editmenuoption-container"); // Add class for styling

  // Create buttons for restoring defaults and saving menu options
  var defaultbutton = document.createElement("div");
  defaultbutton.classList.add("editmenuoption");
  defaultbutton.innerText = "Restore Default";
  defaultbutton.id = "restoredefaultoption"; // Set button ID

  var savebutton = document.createElement("div");
  savebutton.classList.add("editmenuoption");
  savebutton.innerText = "Save";
  savebutton.id = "restoredefaultoption"; // Set button ID

  // Append buttons to the menu settings container
  menusettings.appendChild(defaultbutton);
  menusettings.appendChild(savebutton);

  // Append the menu settings container to the menu
  menu!.appendChild(menusettings);

  // Loop through menu list items and make them draggable
  var ListItems = menu!.firstChild!.childNodes;
  for (let i = 0; i < ListItems.length; i++) {
    const element1 = ListItems[i];
    const element = element1 as HTMLElement;

    (element as HTMLElement).classList.add("draggable"); // Add draggable class
    if ((element as HTMLElement).classList.contains("hasChildren")) {
      (element as HTMLElement).classList.remove("active");
      (element.firstChild as HTMLElement).classList.remove("noscroll");
    }

    // Add toggle switch to each menu item
    let MenuItemToggle = stringToHTML(
      `<div class="onoffswitch" style="margin: auto 0;"><input class="onoffswitch-checkbox notification menuitem" type="checkbox" id="${(element as HTMLElement).dataset.key}"><label for="${(element as HTMLElement).dataset.key}" class="onoffswitch-label"></label>`,
    ).firstChild;
    (element as HTMLElement).append(MenuItemToggle!); // Append the toggle to the element

    // Clone and move elements without "betterseqta" dataset attribute
    if (!element.dataset.betterseqta) {
      const a = document.createElement("section");
      a.innerHTML = element.innerHTML;
      cloneAttributes(a, element);
      menu!.firstChild!.insertBefore(a, element);
      element.remove();
    }
  }

  // Initialize menu items if they haven't been set
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

  // Set initial checkbox states based on settings
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

  // Initialize sortable list for reordering menu items
  try {
    var el = document.querySelector("#menu > ul");
    var sortable = Sortable.create(el as HTMLElement, {
      draggable: ".draggable", // Make elements with "draggable" class sortable
      dataIdAttr: "data-key", // Use "data-key" attribute for item identification
      animation: 150, // Animation speed
      easing: "cubic-bezier(.5,0,.5,1)", // Easing function for the animation
      onEnd: function () {
        saveNewOrder(sortable); // Save new order after dragging
      },
    });
  } catch (err) {
    console.error(err); // Log any errors related to Sortable.js
  }

  // Function to handle display property changes when toggle is changed
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

  // Function to store the current menu settings
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
    settingsState.menuitems = menuItems; // Save updated menu items to settings
  }

  // Add event listeners to menu buttons for changes in settings
  for (let i = 0; i < menubuttons.length; i++) {
    const element = menubuttons[i];
    element.addEventListener("change", () => {
      element.parentElement.parentElement.getAttribute("data-key");
      StoreMenuSettings(); // Store settings on change
      changeDisplayProperty(element); // Change display property based on toggle
    });
  }

  // Function to close all menu settings and reset the menu state
  function closeAll() {
    menusettings?.remove(); // Remove menu settings container
    cover?.remove(); // Remove cover element
    MenuOptionsOpen = false; // Mark menu as closed
    menu!.style.setProperty("--menuHidden", "none"); // Reset menu visibility

    // Reset the menu list items to their original state
    for (let i = 0; i < ListItems.length; i++) {
      const element1 = ListItems[i];
      const element = element1 as HTMLElement;
      element.classList.remove("draggable"); // Remove draggable class
      element.setAttribute("draggable", "false"); // Set draggable attribute to false

      if (!element.dataset.betterseqta) {
        const a = document.createElement("li");
        a.innerHTML = element.innerHTML;
        cloneAttributes(a, element);
        menu!.firstChild!.insertBefore(a, element);
        element.remove();
      }
    }

    // Remove all toggle switches
    let switches = menu!.querySelectorAll(".onoffswitch");
    for (let i = 0; i < switches.length; i++) {
      switches[i].remove();
    }
  }

  // Event listeners for closing menu settings
  cover?.addEventListener("click", closeAll);
  savebutton?.addEventListener("click", closeAll);

  // Event listener for restoring default menu order
  defaultbutton?.addEventListener("click", function () {
    const options = settingsState.defaultmenuorder;
    settingsState.menuorder = options;

    ChangeMenuItemPositions(options); // Change menu item positions to default order

    // Set all menu items as checked and visible
    for (let i = 0; i < menubuttons.length; i++) {
      const element = menubuttons[i];
      element.checked = true;
      element.parentNode.parentNode.style.setProperty(
        "display",
        "flex",
        "important",
      );
    }
    saveNewOrder(sortable); // Save the new order
  });
}

// Function to save the new menu order after dragging
function saveNewOrder(sortable: any) {
  var order = sortable.toArray();
  settingsState.menuorder = order; // Save the new order to settings
}

// Function to clone attributes from one element to another
function cloneAttributes(target: any, source: any) {
  [...source.attributes].forEach((attr) => {
    target.setAttribute(attr.nodeName, attr.nodeValue); // Clone each attribute
  });
}

// Function to change the position of menu items based on a given order
export function ChangeMenuItemPositions(menuorder: SettingsState["menuorder"]) {
  var menuList = document.querySelector("#menu")!.firstChild!.childNodes;

  let listorder = [];
  for (let i = 0; i < menuList.length; i++) {
    const menu = menuList[i] as HTMLElement;

    let a = menuorder.indexOf(menu.dataset.key); // Find index of the menu item in the order array

    listorder.push(a); // Store the index
  }

  var newArr = [];
  for (var i = 0; i < listorder.length; i++) {
    newArr[listorder[i]] = menuList[i]; // Reorder the menu items
  }

  let listItemsDOM = document.getElementById("menu")!.firstChild;
  for (let i = 0; i < newArr.length; i++) {
    const element = newArr[i];
    if (element) {
      const elem = element as HTMLElement;
      elem.setAttribute("data-checked", "true"); // Mark the element as checked
      listItemsDOM!.appendChild(element); // Append the reordered element
    }
  }
}
