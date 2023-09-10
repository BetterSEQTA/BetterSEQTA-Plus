/*global chrome*/

const onoffselection = document.querySelector("#onoff");
const notificationcollector = document.querySelector("#notification");
const lessonalert = document.querySelector("#lessonalert");
const aboutsection = document.querySelector("#aboutsection");
const shortcutsection = document.querySelector("#shortcutsection");
const miscsection = document.querySelector("#miscsection");
//const mainpage = document.querySelector("#mainpage");
const colorpicker = document.querySelector("#colorpicker");
const animatedbk = document.querySelector("#animatedbk");
const bkslider = document.querySelector("#bksliderinput");

const customshortcutbutton = document.getElementsByClassName(
  "custom-shortcuts-button",
)[0];
const customshortcutdiv = document.getElementsByClassName(
  "custom-shortcuts-container",
)[0];
const customshortcutsubmit = document.getElementsByClassName(
  "custom-shortcuts-submit",
)[0];
const customshortcutinputname = document.querySelector("#shortcutname");
const customshortcutinputurl = document.querySelector("#shortcuturl");

const shortcutmenuitemselection =
  document.getElementsByClassName("menushortcut")[0];

const applybutton = document.querySelector("#applychanges");

const navbuttons = document.getElementsByClassName("navitem");
const menupages = document.getElementsByClassName("menu-page");

const allinputs = document.getElementsByTagName("input");

const menupage = document.querySelector("#menupage");

const shortcutpage = document.querySelector("#shortcutpage");

const miscpage = document.querySelector("#miscpage");

var shortcutbuttons = document.getElementsByClassName("shortcutitem");

const github = document.getElementById("github");

const version = document.getElementById("version");
const domainbutton = document.getElementById("domain-button");

var validURL = false;
var validName = false;

function openGithub() {
  chrome.tabs.create({
    url: "https://github.com/SethBurkart123/EvenBetterSEQTA",
  });
}
/*
function openPage(page) {
  mainpage.style.left = "-350px";
  page.style.right = "0px";
}

function backToMainMenu() {
  mainpage.style.left = "0px";

  menupage.style.right = "-350px";
  shortcutpage.style.right = "-350px";
  miscpage.style.right = "-350px";
}*/

function resetActive() {
  for (let i = 0; i < navbuttons.length; i++) {
    navbuttons[i].classList.remove("activenav");
  }
  for (let i = 0; i < menupages.length; i++) {
    menupages[i].classList.add("hiddenmenu");
  }
}

function FindSEQTATab() {
  chrome.tabs.query({}, function (tabs) {
    for (let tab of tabs) {
      if (tab.title.includes("SEQTA Learn")) {
        chrome.tabs.reload(tab.id);
      }
    }
  });
}

function storeSettings() {
  chrome.storage.local.set({ onoff: onoffselection.checked }, function () {
    FindSEQTATab();
  });
}

function storeNotificationSettings() {
  chrome.storage.local.set({
    notificationcollector: notificationcollector.checked,
  });
  chrome.storage.local.set({ lessonalert: lessonalert.checked });
  chrome.storage.local.set({ animatedbk: animatedbk.checked });
  chrome.storage.local.set({ bksliderinput: bkslider.value });
}

function StoreAllSettings() {
  chrome.storage.local.get(["shortcuts"], function (result) {
    var shortcuts = Object.values(result)[0];
    for (var i = 0; i < shortcutbuttons.length; i++) {
      shortcuts[i].enabled = shortcutbuttons[i].checked;
    }
    chrome.storage.local.set({ shortcuts: shortcuts });
  });

  FindSEQTATab();
}
/*
Update the options UI with the settings values retrieved from storage,
or the default settings if the stored settings are empty.
*/
function updateUI(restoredSettings) {
  if (typeof restoredSettings.onoff == "undefined") {
    chrome.runtime.sendMessage({ type: "setDefaultStorage" });

    chrome.storage.local.get(null, function (result) {
      updateUI(result);
    });
  } else {
    onoffselection.checked = restoredSettings.onoff;
    notificationcollector.checked = restoredSettings.notificationcollector;
    lessonalert.checked = restoredSettings.lessonalert;
    animatedbk.checked = restoredSettings.animatedbk;
    bkslider.value = restoredSettings.bksliderinput;
    chrome.storage.local.get(["shortcuts"], function (result) {
      var shortcuts = Object.values(result)[0];
      for (var i = 0; i < shortcutbuttons.length; i++) {
        shortcutbuttons[i].checked = shortcuts[i].enabled;
      }
      chrome.storage.local.set({ shortcuts: shortcuts });
    });
  }
}

var stringtoHTML = function (str) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(str, "text/html");
  return doc.body;
};

function CreateShortcutDiv(name) {
  let div = stringtoHTML(`
  <div class="item-container menushortcuts" data-customshortcut="${name}">
    <div class="text-container">
      <h1 class="addonitem" style="font-size: 8px !important;font-weight: 300;">Custom</h1>
      <h1 class="addonitem">${name}</h1>  
    </div>
    <svg id="delete-${name}" style="width:24px;height:24px;margin: 9px;cursor:pointer;" viewBox="0 0 24 24">
    <path fill="#ffffff" d="M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2M14.59,8L12,10.59L9.41,8L8,9.41L10.59,12L8,14.59L9.41,16L12,13.41L14.59,16L16,14.59L13.41,12L16,9.41L14.59,8Z"></path></svg>
  </div>`).firstChild;

  shortcutmenuitemselection.append(div);

  const deletebutton = document.getElementById(`delete-${name}`);
  deletebutton.addEventListener("click", function () {
    DeleteCustomShortcut(name);
    applybutton.style.left = "4px";
  });
}

function AddCustomShortcuts() {
  chrome.storage.local.get(["customshortcuts"], function (result) {
    var customshortcuts = Object.values(result)[0];
    for (let i = 0; i < customshortcuts.length; i++) {
      const element = customshortcuts[i];
      CreateShortcutDiv(element.name);
    }
  });
}

function DeleteCustomShortcut(name) {
  let item = document.querySelector(`[data-customshortcut="${name}"]`);
  item.remove();
  chrome.storage.local.get(["customshortcuts"], function (result) {
    var customshortcuts = Object.values(result)[0];
    for (let i = 0; i < customshortcuts.length; i++) {
      if (customshortcuts[i].name == name) {
        customshortcuts.splice(i, 1);
      }
    }
    chrome.storage.local.set({ customshortcuts: customshortcuts });
  });
}

function CustomShortcutMenu() {
  customshortcutinputname.value = "";
  customshortcutinputurl.value = "";
  validURL = false;
  validName = false;
  customshortcutsubmit.classList.remove("customshortcut-submit-valid");
  if (
    customshortcutdiv.classList.contains("custom-shortcuts-container-shown")
  ) {
    customshortcutdiv.classList.remove("custom-shortcuts-container-shown");
  } else {
    customshortcutdiv.classList.add("custom-shortcuts-container-shown");
  }
}

function CreateCustomShortcut() {
  const shortcutname = customshortcutinputname.value;
  var shortcuturl = customshortcutinputurl.value;

  if (!shortcuturl.includes("http")) {
    shortcuturl = "https://" + shortcuturl;
  }

  chrome.storage.local.get(["customshortcuts"], function (result) {
    var customshortcuts = Object.values(result)[0];
    customshortcuts.push({
      name: shortcutname,
      url: shortcuturl,
      icon: shortcutname[0].toUpperCase(),
    });
    chrome.storage.local.set({ customshortcuts: customshortcuts });
  });

  CreateShortcutDiv(shortcutname);
}

/*
On opening the options page, fetch stored settings and update the UI with them.
*/
chrome.storage.local.get(null, function (result) {
  document.getElementsByClassName("clr-field")[0].style.color =
    result.selectedColor;
  colorpicker.value = result.selectedColor;
  console.log(result);
  updateUI(result);
});

/*
On blur, save the currently selected settings.
*/
document.addEventListener("DOMContentLoaded", function () {
  version.innerHTML = `v${chrome.runtime.getManifest().version}`;
  github.addEventListener("click", openGithub);

  domainbutton.addEventListener("click", function () {
    chrome.runtime.sendMessage({ type: "addPermissions" });
  });

  aboutsection.addEventListener("click", () => {
    resetActive();
    aboutsection.classList.add("activenav");
    menupage.classList.remove("hiddenmenu");
  });

  shortcutsection.addEventListener("click", () => {
    resetActive();
    shortcutsection.classList.add("activenav");
    shortcutpage.classList.remove("hiddenmenu");
  });

  miscsection.addEventListener("click", () => {
    resetActive();
    miscsection.classList.add("activenav");
    miscpage.classList.remove("hiddenmenu");
  });

  customshortcutbutton.addEventListener("click", () => {
    CustomShortcutMenu();
  });
  customshortcutsubmit.addEventListener("click", () => {
    if (validName && validURL) {
      CreateCustomShortcut();
      CustomShortcutMenu();
    }
  });

  var sameName = false;
  customshortcutinputname.addEventListener("input", function () {
    sameName = false;
    chrome.storage.local.get(["customshortcuts"], function (result) {
      var customshortcuts = Object.values(result)[0];
      for (let i = 0; i < customshortcuts.length; i++) {
        if (customshortcuts[i].name == customshortcutinputname.value) {
          sameName = true;
        }
      }

      if (
        customshortcutinputname.value.length > 0 &&
        customshortcutinputname.value.length < 22 &&
        !sameName
      ) {
        validName = true;
      } else {
        validName = false;
      }

      if (validName && validURL) {
        customshortcutsubmit.classList.add("customshortcut-submit-valid");
      } else {
        customshortcutsubmit.classList.remove("customshortcut-submit-valid");
      }
    });
  });

  customshortcutinputurl.addEventListener("input", function () {
    if (
      customshortcutinputurl.value.length > 0 &&
      customshortcutinputurl.value.includes(".")
    ) {
      validURL = true;
    } else {
      validURL = false;
    }

    if (validName && validURL) {
      customshortcutsubmit.classList.add("customshortcut-submit-valid");
    } else {
      customshortcutsubmit.classList.remove("customshortcut-submit-valid");
    }
  });

  AddCustomShortcuts();
});

onoffselection.addEventListener("change", storeSettings);
notificationcollector.addEventListener("change", storeNotificationSettings);
lessonalert.addEventListener("change", storeNotificationSettings);

animatedbk.addEventListener("change", storeNotificationSettings);
bkslider.addEventListener("change", storeNotificationSettings);

for (let i = 0; i < allinputs.length; i++) {
  if (
    allinputs[i].id != "colorpicker" &&
    allinputs[i].id != "shortcuturl" &&
    allinputs[i].id != "shortcutname"
  ) {
    allinputs[i].addEventListener("change", () => {
      applybutton.style.left = "4px";
    });
  }
}

applybutton.addEventListener("click", () => {
  StoreAllSettings();
  applybutton.style.left = "-150px";
});

colorpicker.addEventListener("input", function () {
  var colorPreview = document.querySelector("#clr-color-preview");
  if (colorPreview.style.color) {
    var hex = colorPreview.style.color.split("(")[1].split(")")[0];
    hex = hex.split(",");
    var b = hex.map(function (x) {
      //For each array element
      x = parseInt(x).toString(16); //Convert to a base16 string
      return x.length == 1 ? "0" + x : x; //Add zero if we get only one character
    });
    b = "#" + b.join("");

    chrome.storage.local.set({ selectedColor: b });
  }
});
