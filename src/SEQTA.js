/*global chrome*/
import ShortcutLinks from "./seqta/content/links.json";
import MenuitemSVGKey from "./seqta/content/MenuItemSVGKey.json";
import stringToHTML from "./seqta/utils/stringToHTML.js";
import loading, { AppendLoadingSymbol } from "./seqta/ui/Loading.js";

// Icons
import assessmentsicon from "./seqta/icons/assessmentsIcon.js";
import coursesicon from "./seqta/icons/coursesIcon.js";

let isChrome = window.chrome;
let SettingsClicked = false;
let MenuOptionsOpen = false;
let UserInitalCode = "";
let currentSelectedDate = new Date();
let WhatsNewOpen = false;
let LessonInterval;
let DarkMode;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function SetDisplayNone(ElementName) {
  return `li[data-key=${ElementName}]{display:var(--menuHidden) !important; transition: 1s;}`;
}

function animbkEnable (item) {
  if (item.animatedbk) {
    CreateBackground();
  } else {
    RemoveBackground();
    document.getElementById("container").style.background = "var(--background-secondary)";
  }
}

function bkValues (item) {
  const bg = document.getElementsByClassName("bg");
  const bg2 = document.getElementsByClassName("bg2");
  const bg3 = document.getElementsByClassName("bg3");
  const value = 200 - item.bksliderinput;

  const minDuration = 1; // minimum duration in seconds
  const maxDuration = 10; // maximum duration in seconds
  const durationRange = maxDuration - minDuration;
  const bgDuration = minDuration + (value / 200) * durationRange;
  const bg2Duration = minDuration + ((value / 200) + 0.05) * durationRange;
  const bg3Duration = minDuration + ((value / 200) + 0.1) * durationRange;

  bg[0].style.animationDuration = `${bgDuration}s`;
  bg2[0].style.animationDuration = `${bg2Duration}s`;
  bg3[0].style.animationDuration = `${bg3Duration}s`;
}

function ApplyCSSToHiddenMenuItems() {
  var stylesheetInnerText = "";
  chrome.storage.local.get(null, function (result) {
    for (let i = 0; i < Object.keys(result.menuitems).length; i++) {
      if (!Object.values(result.menuitems)[i].toggle) {
        stylesheetInnerText += SetDisplayNone(Object.keys(result.menuitems)[i]);
        console.log(
          `[BetterSEQTA+] Hiding ${
            Object.keys(result.menuitems)[i]
          } menu item`,
        );
      }
    }
    let MenuItemStyle = document.createElement("style");
    MenuItemStyle.innerText = stylesheetInnerText;
    document.head.appendChild(MenuItemStyle);
  });
}

function OpenWhatsNewPopup() {
  const background = document.createElement("div");
  background.id = "whatsnewbk";
  background.classList.add("whatsnewBackground");

  const container = document.createElement("div");
  container.classList.add("whatsnewContainer");

  var header = stringToHTML(`<div class="whatsnewHeader">
  <h1>What's New</h1>
  <p>BetterSEQTA+ V${chrome.runtime.getManifest().version}</p>
  </div>`).firstChild;

  let imagecont = document.createElement("div");
  imagecont.classList.add("whatsnewImgContainer");
  var image = document.createElement("img");
  image.src = chrome.runtime.getURL("icons/betterseqta-dark-icon.png");
  image.classList.add("whatsnewImg");
  imagecont.append(image);

  let textcontainer = document.createElement("div");
  textcontainer.classList.add("whatsnewTextContainer");

  let textheader = stringToHTML(
    "<h1 class=\"whatsnewTextHeader\">DESIGN OVERHAUL</h1>",
  ).firstChild;
  textcontainer.append(textheader);

  let text = stringToHTML(
    String.raw`
  <div class="whatsnewTextContainer" style="height: 50%;overflow-y: scroll;">
    <h1>3.0.0 - BetterSEQTA+ *Complete Overhaul*</h1>
  <li>Redesigned appearance</li>
  <li>Upgraded to manifest V3 (longer support)</li>
  <li>Fixed transitional glitches</li>
  <li>Under the hood improvements</li>
  <li>Fixed News Feed</li>
  <h1>2.0.7 - Added support to other domains + Minor bug fixes</h1><li>Fixed BetterSEQTA+ not loading on some pages</li><li>Fixed text colour of notices being unreadable</li><li>Fixed pages not reloading when saving changes</li>
  <h1>2.0.2 - Minor bug fixes</h1><li>Fixed indicator for current lesson</li><li>Fixed text colour for DM messages list in Light mode</li><li>Fixed user info text colour</li>
  <h1>Sleek New Layout</h1><li>Updated with a new font and presentation, BetterSEQTA+ has never looked better.</li>
  <h1>New Updated Sidebar</h1><li>Condensed appearance with new updated icons.</li>
  <h1>Independent Light Mode and Dark Mode</h1><li>Dark mode and Light mode are now available to pick alongside your chosen Theme Colour. Your Theme Colour will now become an accent colour for the page.
  Light/Dark mode can be toggled with the new button, found in the top-right of the menu bar.
  </li>
  <img style="width:150px;margin-bottom:5px" src="${chrome.runtime.getURL(
    "inject/preview/lightdarkmode.png",
  )}">
  <h1>Create Custom Shortcuts</h1><li>Found in the BetterSEQTA+ Settings menu, custom shortcuts can now be created with a name and URL of your choice.</li>
  <img style="width:150px;" src="${chrome.runtime.getURL(
    "inject/preview/customshortcut.png",
  )}">
  </div>
  `,
  ).firstChild;

  let footer = stringToHTML(
    String.raw`
    <div class="whatsnewFooter">
      <div>
      Report bugs and feedback: 
        <a href="https://github.com/SethBurkart123/EvenBetterSEQTA" target="_blank" style="background: none !important; margin: 0 5px; padding:0;"><img style="filter: invert(99%) sepia(0%) saturate(627%) hue-rotate(255deg) brightness(122%) contrast(100%);" height="23" src="${chrome.runtime.getURL("/popup/github.svg",)}" alt=""></a>
        <a href="https://chrome.google.com/webstore/detail/betterseqta%2B/afdgaoaclhkhemfkkkonemoapeinchel" target="_blank" style="background: none !important; margin: 0 5px; padding:0;">
          <svg style="width:25px;height:25px" viewBox="0 0 24 24">
            <path fill="white" d="M12,20L15.46,14H15.45C15.79,13.4 16,12.73 16,12C16,10.8 15.46,9.73 14.62,9H19.41C19.79,9.93 20,10.94 20,12A8,8 0 0,1 12,20M4,12C4,10.54 4.39,9.18 5.07,8L8.54,14H8.55C9.24,15.19 10.5,16 12,16C12.45,16 12.88,15.91 13.29,15.77L10.89,19.91C7,19.37 4,16.04 4,12M15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9A3,3 0 0,1 15,12M12,4C14.96,4 17.54,5.61 18.92,8H12C10.06,8 8.45,9.38 8.08,11.21L5.7,7.08C7.16,5.21 9.44,4 12,4M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        </a>
      </div>
    </div>
  `).firstChild;

  let exitbutton = document.createElement("div");
  exitbutton.innerText = "x";
  exitbutton.id = "whatsnewclosebutton";

  container.append(header);
  container.append(imagecont);
  container.append(textcontainer);
  container.append(text);
  container.append(footer);
  container.append(exitbutton);

  document.getElementById("container").append(background);
  document.getElementById("container").append(container);

  chrome.storage.local.remove(["justupdated"]);

  var bkelement = document.getElementById("whatsnewbk");
  bkelement.addEventListener("click", function () {
    DeleteWhatsNew();
    WhatsNewOpen = false;
  });
  var closeelement = document.getElementById("whatsnewclosebutton");
  closeelement.addEventListener("click", function () {
    DeleteWhatsNew();
    WhatsNewOpen = false;
  });
}

async function finishLoad() {
  try {
    var loadingbk = document.getElementById("loading");
    loadingbk.style.opacity = "0";
    await delay(501);
    loadingbk.remove();
  } catch (err) {
    console.log(err);
  }

  chrome.storage.local.get(["justupdated"], function (result) {
    if (result.justupdated) {
      WhatsNewOpen = true;
      OpenWhatsNewPopup();
    }
  });
}

async function DeleteWhatsNew() {
  var bkelement = document.getElementById("whatsnewbk");
  var popup = document.getElementsByClassName("whatsnewContainer")[0];
  bkelement.classList.add("whatsnewfadeout");
  popup.classList.add("whatsnewzoomout");
  await delay(500);
  bkelement.remove();
  popup.remove();
}

function CreateBackground() {
  // Creating and inserting 3 divs containing the background applied to the pages
  var bklocation = document.getElementById("container");
  var menu = document.getElementById("menu");
  var bk = document.createElement("div");
  bk.classList.add("bg");

  bklocation.insertBefore(bk, menu);

  var bk2 = document.createElement("div");
  bk2.classList.add("bg");
  bk2.classList.add("bg2");
  bklocation.insertBefore(bk2, menu);

  var bk3 = document.createElement("div");
  bk3.classList.add("bg");
  bk3.classList.add("bg3");
  bklocation.insertBefore(bk3, menu);
}

function RemoveBackground() {
  var bk = document.getElementsByClassName("bg");
  var bk2 = document.getElementsByClassName("bg2");
  var bk3 = document.getElementsByClassName("bg3");
  bk[0].remove();
  bk2[0].remove();
  bk3[0].remove();
}

function waitForElm(selector) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

async function RunColourCheck(element) {
  if (
    typeof element.contentDocument.documentElement.childNodes[1] == "undefined"
  ) {
    await delay(1000);
    RunColourCheck(element);
  } else {
    element.contentDocument.documentElement.childNodes[1].style.color = "white";
  }
}

function GetiFrameCSSElement() {
  var cssFile = chrome.runtime.getURL("inject/iframe.css");
  var fileref = document.createElement("link");
  fileref.setAttribute("rel", "stylesheet");
  fileref.setAttribute("type", "text/css");
  fileref.setAttribute("href", cssFile);

  return fileref;
}

function CheckiFrameItems() {
  // Injecting CSS File to the webpage to overwrite iFrame default CSS
  let fileref = GetiFrameCSSElement();

  const observer = new MutationObserver(function (mutations_list) {
    mutations_list.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (added_node) {
        if (added_node.tagName == "IFRAME") {
          chrome.storage.local.get(["DarkMode"], function (result) {
            DarkMode = result.DarkMode;
            if (DarkMode) {
              RunColourCheck(added_node);
              if (
                added_node.contentDocument.documentElement.childNodes[1].style
                  .color != "white"
              ) {
                added_node.contentDocument.documentElement.childNodes[1].style.color =
                  "white";
              }
              if (
                !added_node.contentDocument.documentElement.firstChild.innerHTML.includes(
                  "iframe.css",
                )
              ) {
                added_node.contentDocument.documentElement.firstChild.appendChild(
                  fileref,
                );
              }
              added_node.addEventListener("load", function () {
                if (
                  added_node.contentDocument.documentElement.childNodes[1].style
                    .color != "white"
                ) {
                  added_node.contentDocument.documentElement.childNodes[1].style.color =
                    "white";
                }
                if (
                  !added_node.contentDocument.documentElement.firstChild.innerHTML.includes(
                    "iframe.css",
                  )
                ) {
                  added_node.contentDocument.documentElement.firstChild.appendChild(
                    fileref,
                  );
                }
              });
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
  });
}

function SortMessagePageItems(messagesParentElement) {
  let filterbutton = document.createElement("div");
  filterbutton.classList.add("messages-filterbutton");
  filterbutton.innerText = "Filter";

  let header = document.getElementsByClassName(
    "MessageList__MessageList___3DxoC",
  )[0].firstChild;
  header.append(filterbutton);

  const observer = new MutationObserver(function (mutations_list) {
    mutations_list.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (added_node) {
        if (added_node.dataset.message) {
          // Check if added_node.firstChild.title is in block list
        }
      });
    });
  });

  observer.observe(messagesParentElement, {
    subtree: true,
    childList: true,
  });
}

function LoadPageElements() {
  AddBetterSEQTAElements(true);
  var sublink = window.location.href.split("/")[4];
  switch (sublink) {
  case "news":
    console.log("[BetterSEQTA+] Started Init");
    chrome.storage.local.get(null, function (result) {
      if (result.onoff) {
        SendNewsPage();

        // Sends similar HTTP Post Request for the notices
        chrome.storage.local.get(null, function (result) {
          if (result.notificationcollector) {
            var xhr3 = new XMLHttpRequest();
            xhr3.open(
              "POST",
              `${location.origin}/seqta/student/heartbeat?`,
              true,
            );
            xhr3.setRequestHeader(
              "Content-Type",
              "application/json; charset=utf-8",
            );
            xhr3.onreadystatechange = function () {
              if (xhr3.readyState === 4) {
                var Notifications = JSON.parse(xhr3.response);
                var alertdiv = document.getElementsByClassName(
                  "notifications__bubble___1EkSQ",
                )[0];
                if (typeof alertdiv == "undefined") {
                  console.log(
                    "[BetterSEQTA+] No notifications currently",
                  );
                } else {
                  alertdiv.textContent =
                      Notifications.payload.notifications.length;
                }
              }
            };
            xhr3.send(
              JSON.stringify({
                timestamp: "1970-01-01 00:00:00.0",
                hash: "#?page=/home",
              }),
            );
          }
        });

        finishLoad();
      }
    });
    break;

  case "home":
    window.location.replace(`${location.origin}/#?page=/home`);
    LoadInit();
    break;
  case undefined:
    window.location.replace(`${location.origin}/#?page=/home`);
    LoadInit();
    break;
  default:
    finishLoad();

    // Sends similar HTTP Post Request for the notices
    chrome.storage.local.get(null, function (result) {
      if (result.notificationcollector) {
        var xhr3 = new XMLHttpRequest();
        xhr3.open(
          "POST",
          `${location.origin}/seqta/student/heartbeat?`,
          true,
        );
        xhr3.setRequestHeader(
          "Content-Type",
          "application/json; charset=utf-8",
        );
        xhr3.onreadystatechange = function () {
          if (xhr3.readyState === 4) {
            var Notifications = JSON.parse(xhr3.response);
            var alertdiv = document.getElementsByClassName(
              "notifications__bubble___1EkSQ",
            )[0];
            if (typeof alertdiv == "undefined") {
              console.log("[BetterSEQTA+] No notifications currently");
            } else {
              alertdiv.textContent =
                  Notifications.payload.notifications.length;
            }
          }
        };
        xhr3.send(
          JSON.stringify({
            timestamp: "1970-01-01 00:00:00.0",
            hash: "#?page=/home",
          }),
        );
      }
    });
    break;
  }

  const observer = new MutationObserver(function (mutations_list) {
    mutations_list.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (added_node) {
        if (added_node.classList.contains("messages")) {
          let element = document.getElementById("title").firstChild;
          element.innerText = "Direct Messages";
          document.title = "Direct Messages ― SEQTA Learn";
          SortMessagePageItems(added_node);
        } else if (added_node.classList.contains("notices")) {
          CheckNoticeTextColour(added_node);
        }
      });
    });
  });

  observer.observe(document.querySelector("#main"), {
    subtree: false,
    childList: true,
  });
}

function CheckNoticeTextColour(notice) {
  const observer = new MutationObserver(function (mutations_list) {
    mutations_list.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (added_node) {
        chrome.storage.local.get(["DarkMode"], function (result) {
          DarkMode = result.DarkMode;
          if (added_node.classList.contains("notice")) {
            var hex = added_node.style.cssText.split(" ")[1];
            var threshold = GetThresholdofHex(hex);
            if (DarkMode && threshold < 100) {
              added_node.style.cssText = "--color: undefined;";
            }
          }
        });
      });
    });
  });

  observer.observe(notice, {
    subtree: true,
    childList: true,
  });
}

function tryLoad() {
  waitForElm(".login").then(() => {
    finishLoad();
  });

  waitForElm(".day-container").then(() => {
    finishLoad();
  });

  waitForElm("[data-key=welcome]").then((elm) => {
    elm.classList.remove("active");
  });

  waitForElm(".code").then((elm) => {
    if (!elm.innerText.includes("BetterSEQTA")) LoadPageElements();
  });

  // Waits for page to call on load, run scripts
  document.addEventListener(
    "load",
    function () {
      CheckiFrameItems();
    },
    true,
  );
}

function ChangeMenuItemPositions(storage) {
  let menuorder = storage;

  var menuList = document.querySelector("#menu").firstChild.childNodes;

  let listorder = [];
  for (let i = 0; i < menuList.length; i++) {

    let a = menuorder.indexOf(menuList[i].dataset.key);

    listorder.push(a);
  }

  var newArr = [];
  for (var i = 0; i < listorder.length; i++) {
    newArr[listorder[i]] = menuList[i];
  }

  let listItemsDOM = document.getElementById("menu").firstChild;
  for (let i = 0; i < newArr.length; i++) {
    const element = newArr[i];
    if (element) {
      element.setAttribute("data-checked", "true");
      listItemsDOM.appendChild(element);
    }
  }
}

async function ObserveMenuItemPosition() {
  chrome.storage.local.get(null, function (result) {
    let menuorder = result.menuorder;
    if (menuorder && result.onoff) {
      const observer = new MutationObserver(function (mutations_list) {
        mutations_list.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (added_node) {
            if (!added_node?.dataset?.checked && !MenuOptionsOpen) {
              if (MenuitemSVGKey[added_node?.dataset?.key]) {
                ReplaceMenuSVG(
                  added_node,
                  MenuitemSVGKey[added_node.dataset.key],
                );
              }
              ChangeMenuItemPositions(menuorder);
            }
          });
        });
      });

      observer.observe(document.querySelector("#menu").firstChild, {
        subtree: true,
        childList: true,
      });
    }
  });
}

function AppendElementsToDisabledPage() {
  AddBetterSEQTAElements(false);

  let settingsStyle = document.createElement("style");
  settingsStyle.innerText = `
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
  `;
  document.head.append(settingsStyle);
}

function lightenAndPaleColor(
  hexColor,
  lightenFactor = 0.75,
  paleFactor = 0.55,
) {
  // Convert a RGB value to HSL
  function rgbToHsl(r, g, b) {
    (r /= 255), (g /= 255), (b /= 255);
    let max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      }
      h /= 6;
    }

    return [h, s, l];
  }

  // Convert an HSL value to RGB
  function hslToRgb(h, s, l) {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      let p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [r * 255, g * 255, b * 255];
  }

  // Extract the red, green, and blue components from hex
  let r = parseInt(hexColor.substr(1, 2), 16);
  let g = parseInt(hexColor.substr(3, 2), 16);
  let b = parseInt(hexColor.substr(5, 2), 16);

  // Convert RGB to HSL
  let [h, s, l] = rgbToHsl(r, g, b);

  // Adjust saturation and lightness
  s -= s * paleFactor;
  l += (1 - l) * lightenFactor;

  // Convert HSL back to RGB
  [r, g, b] = hslToRgb(h, s, l);

  // Convert RGB to hex
  r = Math.round(r).toString(16).padStart(2, "0");
  g = Math.round(g).toString(16).padStart(2, "0");
  b = Math.round(b).toString(16).padStart(2, "0");

  return "#" + r + g + b;
}

function ColorLuminance(hex, lum) {
  // validate hex string
  hex = String(hex).replace(/[^0-9a-f]/gi, "");
  if (hex.length < 6) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  lum = lum || 0;

  // convert to decimal and change luminosity
  var rgb = "#",
    c,
    i;
  for (i = 0; i < 3; i++) {
    c = parseInt(hex.substr(i * 2, 2), 16);
    c = Math.round(Math.min(Math.max(0, c + c * lum), 255)).toString(16);
    rgb += ("00" + c).substring(c.length);
  }

  return rgb;
}

chrome.storage.onChanged.addListener(function (changes) {
  if (changes.selectedColor) {
    try {
      chrome.storage.local.get(["DarkMode"], function (result) {
        if (!result.DarkMode) {
          document.documentElement.style.setProperty(
            "--better-pale",
            lightenAndPaleColor(changes.selectedColor.newValue),
          );
        }
      });
    } catch (err) {
      console.log(err);
    }

    let rbg = GetThresholdofHex(changes.selectedColor.newValue);
    if (rbg > 210) {
      document.documentElement.style.setProperty("--text-color", "black");
      document.documentElement.style.setProperty(
        "--betterseqta-logo",
        `url(${chrome.runtime.getURL("icons/betterseqta-dark-full.png")})`,
      );
    } else {
      document.documentElement.style.setProperty("--text-color", "white");
      document.documentElement.style.setProperty(
        "--betterseqta-logo",
        `url(${chrome.runtime.getURL("icons/betterseqta-light-full.png")})`,
      );
    }

    document.documentElement.style.setProperty(
      "--better-main",
      changes.selectedColor.newValue,
    );
    // document.documentElement.style.setProperty('--better-sub', ColorLuminance(changes.selectedColor.newValue, -0.15));

    if (changes.selectedColor.newValue == "#ffffff") {
      document.documentElement.style.setProperty("--better-light", "#b7b7b7");
    } else {
      document.documentElement.style.setProperty(
        "--better-light",
        ColorLuminance(changes.selectedColor.newValue, 0.99),
      );
    }
  }

  if (changes?.customshortcuts?.newValue) {
    if (changes.customshortcuts.oldValue.length > 0) {
      CreateCustomShortcutDiv(
        changes.customshortcuts.newValue[
          changes.customshortcuts.oldValue.length
        ],
      );
    } else {
      CreateCustomShortcutDiv(changes.customshortcuts.newValue[0]);
    }
  }
});

var PageLoaded = false;
async function CheckLoadOnPeriods() {
  if (!PageLoaded) {
    await delay(1000);
    var code = document.getElementsByClassName("code")[0];
    if (code && !UserInitalCode) {
      LoadPageElements();
      finishLoad();
      PageLoaded = true;
    }
    if (!code) {
      CheckLoadOnPeriods();
    }
  }
}

function RunFunctionOnTrue(storedSetting) {
  DarkMode = storedSetting.DarkMode;
  // If the option is 'on', open BetterSEQTA
  if (typeof storedSetting.onoff == "undefined") {
    chrome.runtime.sendMessage({ type: "setDefaultStorage" });
  }
  if (storedSetting.onoff) {
    console.log("[BetterSEQTA+] Enabled");
    // Injecting CSS File to the webpage to overwrite SEQTA's default CSS
    var cssFile = chrome.runtime.getURL("inject/injected.css");
    var fileref = document.createElement("link");
    fileref.setAttribute("rel", "stylesheet");
    fileref.setAttribute("type", "text/css");
    fileref.setAttribute("href", cssFile);
    document.head.appendChild(fileref);
    document.getElementsByTagName("html")[0].appendChild(fileref);

    // Injecting custom icons font file
    const fontURL = chrome.runtime.getURL("fonts/IconFamily.woff");

    const style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.innerHTML = `
    @font-face {
      font-family: 'IconFamily';
      src: url('${fontURL}') format('woff');
      font-weight: normal;
      font-style: normal;
    }`;
    document.head.appendChild(style);


    document.documentElement.style.setProperty("--better-sub", "#161616");
    document.documentElement.style.setProperty(
      "--better-alert-highlight",
      "#c61851",
    );

    if (storedSetting.DarkMode) {
      document.documentElement.style.setProperty(
        "--background-primary",
        "#232323",
      );
      document.documentElement.style.setProperty(
        "--background-secondary",
        "#1a1a1a",
      );
      document.documentElement.style.setProperty("--text-primary", "white");
    } else {
      try {
        document.documentElement.style.setProperty(
          "--better-pale",
          lightenAndPaleColor(storedSetting.selectedColor),
        );
      } catch (err) {
        console.log(err);
      }
      document.documentElement.style.setProperty(
        "--background-primary",
        "#ffffff",
      );
      document.documentElement.style.setProperty(
        "--background-secondary",
        "#e5e7eb",
      );
      document.documentElement.style.setProperty("--text-primary", "black");
    }

    document.querySelector("link[rel*=\"icon\"]").href =
      chrome.runtime.getURL("icons/icon-48.png");

    let rbg = GetThresholdofHex(storedSetting.selectedColor);
    if (rbg > 210) {
      document.documentElement.style.setProperty("--text-color", "black");
      document.documentElement.style.setProperty(
        "--betterseqta-logo",
        `url(${chrome.runtime.getURL("icons/betterseqta-dark-full.png")})`,
      );
    } else {
      document.documentElement.style.setProperty("--text-color", "white");
      document.documentElement.style.setProperty(
        "--betterseqta-logo",
        `url(${chrome.runtime.getURL("icons/betterseqta-light-full.png")})`,
      );
    }

    document.documentElement.style.setProperty(
      "--better-main",
      storedSetting.selectedColor,
    );
    // document.documentElement.style.setProperty('--better-sub', ColorLuminance(storedSetting.selectedColor, -0.15));

    if (storedSetting.selectedColor == "#ffffff") {
      document.documentElement.style.setProperty("--better-light", "#b7b7b7");
    } else {
      document.documentElement.style.setProperty(
        "--better-light",
        ColorLuminance(storedSetting.selectedColor, 0.95),
      );
    }

    ApplyCSSToHiddenMenuItems();

    loading();

    CheckLoadOnPeriods();

    if (!isChrome || isChrome == "undefined") {
      tryLoad();
    }

    window.addEventListener("load", function () {
      tryLoad();
    });
  } else {
    if (!isChrome || isChrome == "undefined") {
      waitForElm(".code").then(() => {
        AppendElementsToDisabledPage();
      });
    }
    window.addEventListener("load", function () {
      waitForElm(".code").then(() => {
        AppendElementsToDisabledPage();
      });
    });
  }
}

async function CheckForMenuList() {
  if (!MenuItemMutation) {
    try {
      if (document.getElementById("menu").firstChild) {
        ObserveMenuItemPosition();
        MenuItemMutation = true;
      }
    } catch (error) {
      return;
    }
  }
}

var MenuItemMutation = false;
var NonSEQTAPage = false;
var IsSEQTAPage = false;
document.addEventListener(
  "load",
  function () {
    CheckForMenuList();
    if (
      document.childNodes[1].textContent?.includes(
        "Copyright (c) SEQTA Software",
      ) &&
      document.title.includes("SEQTA Learn") &&
      !IsSEQTAPage
    ) {
      IsSEQTAPage = true;
      console.log("[BetterSEQTA+] Verified SEQTA Page");

      var link = document.createElement("link");
      link.href = chrome.runtime.getURL("inject/documentload.css");
      link.type = "text/css";
      link.rel = "stylesheet";
      document.getElementsByTagName("html")[0].appendChild(link);

      chrome.storage.local.get(null, function (items) {
        RunFunctionOnTrue(items);
      });
    }
    if (
      !document.childNodes[1].textContent?.includes("SEQTA") &&
      !NonSEQTAPage
    ) {
      NonSEQTAPage = true;
    }
  },
  true,
);

function RunExtensionSettingsJS() {
  const whatsnewsettings = document.getElementById("whatsnewsettings");
  whatsnewsettings.addEventListener("click", function () {
    if (!WhatsNewOpen) {
      WhatsNewOpen = true;
      OpenWhatsNewPopup();
    }
  });

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

  var validURL = false;
  var validName = false;

  const github = document.getElementById("github");

  function openGithub() {
    chrome.runtime.sendMessage({ type: "githubTab" });
  }

  function resetActive() {
    for (let i = 0; i < navbuttons.length; i++) {
      navbuttons[i].classList.remove("activenav");
    }
    for (let i = 0; i < menupages.length; i++) {
      menupages[i].classList.add("hiddenmenu");
    }
  }

  function FindSEQTATab() {
    chrome.runtime.sendMessage({ type: "reloadTabs" });
  }
  /*
  Store the currently selected settings using chrome.storage.local.
  */
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

  function CreateShortcutDiv(name) {
    let div = stringToHTML(`
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
    document.getElementsByClassName("shortcut-container")[0].style.display =
      "block";
  }

  chrome.storage.local.get(null, function (result) {
    document.getElementsByClassName("clr-field")[0].style.color =
      result.selectedColor;
    colorpicker.value = result.selectedColor;
    updateUI(result);
  });

  github.addEventListener("click", openGithub);
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

  onoffselection.addEventListener("change", storeSettings);
  notificationcollector.addEventListener("change", storeNotificationSettings);
  lessonalert.addEventListener("change", storeNotificationSettings);
  bkslider.addEventListener("change", () => {
    storeNotificationSettings();
    chrome.storage.local.get(["bksliderinput"]).then(bkValues);
  });
  animatedbk.addEventListener("change", () => {
    storeNotificationSettings();
    animbkEnable({ animatedbk: animatedbk.checked });
  });

  for (let i = 0; i < allinputs.length; i++) {
    if (
      allinputs[i].id != "colorpicker" &&
      allinputs[i].id != "shortcuturl" &&
      allinputs[i].id != "shortcutname" &&
      allinputs[i].id != "bkslider" &&
      allinputs[i].id != "bksliderinput"
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
}

function CallExtensionSettings() {
  // Injecting CSS File to the webpage to overwrite iFrame default CSS
  var cssFile = chrome.runtime.getURL("popup/info.css");
  var fileref = document.createElement("link");
  fileref.setAttribute("rel", "stylesheet");
  fileref.setAttribute("type", "text/css");
  fileref.setAttribute("href", cssFile);
  document.head.append(fileref);

  var jsFile = chrome.runtime.getURL("popup/coloris.js");
  fileref = document.createElement("script");
  fileref.setAttribute("src", jsFile);
  document.head.append(fileref);

  cssFile = chrome.runtime.getURL("popup/coloris.css");
  fileref = document.createElement("link");
  fileref.setAttribute("rel", "stylesheet");
  fileref.setAttribute("type", "text/css");
  fileref.setAttribute("href", cssFile);
  document.head.append(fileref);

  let Settings =
    stringToHTML(
      String.raw`
      <div class="outside-container hidden" id="ExtensionPopup"><div class="logo-container"><img src=${chrome.runtime.getURL(
    "icons/betterseqta-light-full.png",
  )}></div>
  <div class="main-page" id="mainpage">
      <div class="topmenu">
        <div class="navitem activenav" id="miscsection">Settings</div>
        <div class="navitem" id="shortcutsection">Shortcuts</div>
        <div class="navitem" id="aboutsection">About</div>
      </div>
    </div>
  

  <div class="menu-page hiddenmenu" id="menupage">
    <div class="selector-container" style="margin-bottom: 0;">
      <div class="menu-item-selection">
          <div class="aboutcontainer">
          <div>
            <h1 class="addonitem">About</h1>
            <p class="item subitem">Created and developed and maintained by SethBurkart123</p>
            <p class="item subitem">BetterSEQTA+ is a fork of the project BetterSEQTA, BetterSEQTA is no longer supported so we are here to fill that gap!</p>
          </div>
        </div>

        <div class="aboutcontainer">
          <div>
            <a class="aboutlinks" href="https://chrome.google.com/webstore/detail/betterseqta/boikofabjaholheekefimfojfncpjfib" target="_blank">
              <svg style="width:24px;height:24px" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,20L15.46,14H15.45C15.79,13.4 16,12.73 16,12C16,10.8 15.46,9.73 14.62,9H19.41C19.79,9.93 20,10.94 20,12A8,8 0 0,1 12,20M4,12C4,10.54 4.39,9.18 5.07,8L8.54,14H8.55C9.24,15.19 10.5,16 12,16C12.45,16 12.88,15.91 13.29,15.77L10.89,19.91C7,19.37 4,16.04 4,12M15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9A3,3 0 0,1 15,12M12,4C14.96,4 17.54,5.61 18.92,8H12C10.06,8 8.45,9.38 8.08,11.21L5.7,7.08C7.16,5.21 9.44,4 12,4M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
            </svg>
              Chrome Webstore
            </a>
            <a class="aboutlinks" href="https://addons.mozilla.org/en-US/firefox/addon/betterseqta/" target="_blank">
              <svg style="width:24px;height:24px" viewBox="0 0 24 24">
                <path fill="currentColor" d="M9.27 7.94C9.27 7.94 9.27 7.94 9.27 7.94M6.85 6.74C6.86 6.74 6.86 6.74 6.85 6.74M21.28 8.6C20.85 7.55 19.96 6.42 19.27 6.06C19.83 7.17 20.16 8.28 20.29 9.1L20.29 9.12C19.16 6.3 17.24 5.16 15.67 2.68C15.59 2.56 15.5 2.43 15.43 2.3C15.39 2.23 15.36 2.16 15.32 2.09C15.26 1.96 15.2 1.83 15.17 1.69C15.17 1.68 15.16 1.67 15.15 1.67H15.13L15.12 1.67L15.12 1.67L15.12 1.67C12.9 2.97 11.97 5.26 11.74 6.71C11.05 6.75 10.37 6.92 9.75 7.22C9.63 7.27 9.58 7.41 9.62 7.53C9.67 7.67 9.83 7.74 9.96 7.68C10.5 7.42 11.1 7.27 11.7 7.23L11.75 7.23C11.83 7.22 11.92 7.22 12 7.22C12.5 7.21 12.97 7.28 13.44 7.42L13.5 7.44C13.6 7.46 13.67 7.5 13.75 7.5C13.8 7.54 13.86 7.56 13.91 7.58L14.05 7.64C14.12 7.67 14.19 7.7 14.25 7.73C14.28 7.75 14.31 7.76 14.34 7.78C14.41 7.82 14.5 7.85 14.54 7.89C14.58 7.91 14.62 7.94 14.66 7.96C15.39 8.41 16 9.03 16.41 9.77C15.88 9.4 14.92 9.03 14 9.19C17.6 11 16.63 17.19 11.64 16.95C11.2 16.94 10.76 16.85 10.34 16.7C10.24 16.67 10.14 16.63 10.05 16.58C10 16.56 9.93 16.53 9.88 16.5C8.65 15.87 7.64 14.68 7.5 13.23C7.5 13.23 8 11.5 10.83 11.5C11.14 11.5 12 10.64 12.03 10.4C12.03 10.31 10.29 9.62 9.61 8.95C9.24 8.59 9.07 8.42 8.92 8.29C8.84 8.22 8.75 8.16 8.66 8.1C8.43 7.3 8.42 6.45 8.63 5.65C7.6 6.12 6.8 6.86 6.22 7.5H6.22C5.82 7 5.85 5.35 5.87 5C5.86 5 5.57 5.16 5.54 5.18C5.19 5.43 4.86 5.71 4.56 6C4.21 6.37 3.9 6.74 3.62 7.14C3 8.05 2.5 9.09 2.28 10.18C2.28 10.19 2.18 10.59 2.11 11.1L2.08 11.33C2.06 11.5 2.04 11.65 2 11.91L2 11.94L2 12.27L2 12.32C2 17.85 6.5 22.33 12 22.33C16.97 22.33 21.08 18.74 21.88 14C21.9 13.89 21.91 13.76 21.93 13.63C22.13 11.91 21.91 10.11 21.28 8.6Z" />
            </svg>
              Firefox Add-ons
            </a>

            <a class="aboutlinks" href="https://betterseqta.com" target="_blank">
              <svg style="width:24px;height:24px" viewBox="0 0 24 24">
                <path fill="currentColor" d="M10.59,13.41C11,13.8 11,14.44 10.59,14.83C10.2,15.22 9.56,15.22 9.17,14.83C7.22,12.88 7.22,9.71 9.17,7.76V7.76L12.71,4.22C14.66,2.27 17.83,2.27 19.78,4.22C21.73,6.17 21.73,9.34 19.78,11.29L18.29,12.78C18.3,11.96 18.17,11.14 17.89,10.36L18.36,9.88C19.54,8.71 19.54,6.81 18.36,5.64C17.19,4.46 15.29,4.46 14.12,5.64L10.59,9.17C9.41,10.34 9.41,12.24 10.59,13.41M13.41,9.17C13.8,8.78 14.44,8.78 14.83,9.17C16.78,11.12 16.78,14.29 14.83,16.24V16.24L11.29,19.78C9.34,21.73 6.17,21.73 4.22,19.78C2.27,17.83 2.27,14.66 4.22,12.71L5.71,11.22C5.7,12.04 5.83,12.86 6.11,13.65L5.64,14.12C4.46,15.29 4.46,17.19 5.64,18.36C6.81,19.54 8.71,19.54 9.88,18.36L13.41,14.83C14.59,13.66 14.59,11.76 13.41,10.59C13,10.2 13,9.56 13.41,9.17Z" />
            </svg>
              betterseqta.com
            </a>

          </div>
        </div>
        <div class="aboutcontainer">
          <div>

          </div>
        </div>

        <div class="aboutcontainer" style="color: rgb(155, 155, 155); font-size: 14px; margin-top: 7px;">
        <p>Contact: <a href="https://github.com/SethBurkart123/EvenBetterSEQTA/issues">Open an issue on my github</a></p>
        </div>

      </div>
    </div>
  </div>

  <div class="menu-page hiddenmenu" id="shortcutpage">
    <div class="selector-container" style="margin-bottom: 0; max-height: 17em; overflow-y:hidden;">
      <div>
        <div class="custom-shortcuts-button custom-shortcuts-buttons">Create Custom Shortcut</div>
        <div class="custom-shortcuts-container">
          <label for="shortcutname" class="custom-shortcuts-label">Shortcut Name:</label>
          <input type="text" id="shortcutname" name="shortcutname" class="custom-shortcuts-field" placeholder="e.g. Google" maxlength="20">
          <label for="shortcuturl" class="custom-shortcuts-label">URL:</label>
          <input type="text" id="shortcuturl" name="shortcuturl" class="custom-shortcuts-field" placeholder="e.g. https://www.google.com">
          <div class="custom-shortcuts-submit custom-shortcuts-buttons">Create</div>
        </div>
      </div>
      <div class="menu-item-selection menushortcut">
        <div class="item-container menushortcuts">
          <div class="text-container">
            <h1 class="addonitem">YouTube</h1>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification shortcutitem" type="checkbox" id="youtube">
            <label for="youtube" class="onoffswitch-label"></label>
          </div>
        </div>
        <div class="item-container menushortcuts">
          <div class="text-container">
            <h1 class="addonitem">Outlook</h1>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification shortcutitem" type="checkbox" id="outlook">
            <label for="outlook" class="onoffswitch-label"></label>
          </div>
        </div>
        <div class="item-container menushortcuts">
          <div class="text-container">
            <h1 class="addonitem">Office</h1>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification shortcutitem" type="checkbox" id="office">
            <label for="office" class="onoffswitch-label"></label>
          </div>
        </div>
        <div class="item-container menushortcuts">
          <div class="text-container">
            <h1 class="addonitem">Spotify</h1>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification shortcutitem" type="checkbox" id="spotify">
            <label for="spotify" class="onoffswitch-label"></label>
          </div>
        </div>
        <div class="item-container menushortcuts">
          <div class="text-container">
            <h1 class="addonitem">Google</h1>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification shortcutitem" type="checkbox" id="google">
            <label for="google" class="onoffswitch-label"></label>
          </div>
        </div>
        <div class="item-container menushortcuts">
          <div class="text-container">
            <h1 class="addonitem">DuckDuckGo</h1>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification shortcutitem" type="checkbox"
              id="duckduckgo">
              <label for="duckduckgo" class="onoffswitch-label"></label>
            </div>
        </div>
        <div class="item-container menushortcuts">
          <div class="text-container">
            <h1 class="addonitem">Cool Math Games</h1>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification shortcutitem" type="checkbox"
              id="coolmathgames">
              <label for="coolmathgames" class="onoffswitch-label"></label>
            </div>
        </div>
        <div class="item-container menushortcuts">
          <div class="text-container">
            <h1 class="addonitem">SACE</h1>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification shortcutitem" type="checkbox" id="sace">
            <label for="sace" class="onoffswitch-label"></label>
          </div>
        </div>
        <div class="item-container menushortcuts">
          <div class="text-container">
            <h1 class="addonitem">Google Scholar</h1>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification shortcutitem" type="checkbox"
              id="googlescholar">
              <label for="googlescholar" class="onoffswitch-label"></label>
            </div>
        </div>
        <div class="item-container menushortcuts">
          <div class="text-container">
            <h1 class="addonitem">Gmail</h1>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification shortcutitem" type="checkbox" id="gmail">
            <label for="gmail" class="onoffswitch-label"></label>
          </div>
        </div>
        <div class="item-container menushortcuts">
          <div class="text-container">
            <h1 class="addonitem">Netflix</h1>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification shortcutitem" type="checkbox" id="netflix">
            <label for="netflix" class="onoffswitch-label"></label>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="menu-page" id="miscpage">
    <div class="selector-container" style="margin-bottom: 0;">
      <div class="menu-item-selection">

        <div class="item-container">
          <div class="text-container">
            <h1 class="addonitem">Notification Collector</h1>
            <p class="item subitem">Uncaps the 9+ limit for notifications, showing the real number.</p>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification" type="checkbox" id="notification">
          <label for="notification" class="onoffswitch-label"></label>
          </div>
        </div>


        <div class="item-container">
          <div class="text-container">
            <h1 class="addonitem">Lesson Alerts</h1>
            <p class="item subitem">Sends a native browser notification ~5 minutes prior to lessons.</p>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification" type="checkbox" id="lessonalert">
            <label for="lessonalert" class="onoffswitch-label"></label>
          </div>
        </div>

        <div class="item-container">
          <div class="text-container">
            <h1 class="addonitem">Animated Background</h1>
            <p class="item subitem">Adds an animated background to BetterSEQTA. (May impact battery life)</p>
          </div>
          <div class="onoffswitch"><input class="onoffswitch-checkbox notification" type="checkbox" id="animatedbk">
          <label for="animatedbk" class="onoffswitch-label"></label>
          </div>
        </div>

        <div class="item-container">
          <div class="text-container">
            <h1 class="addonitem">Animated Background Speed</h1>
            <p class="item subitem">Controls the speed of the animated background.</p>
          </div>
          <div class="bkslider">
            <input type="range" id="bksliderinput" name="Animated Background Slider" min="1" max="200" />
          </div>
        </div>

        <div class="item-container">
          <div class="text-container">
            <h1 class="addonitem">Custom Theme Colour</h1>
            <p class="item subitem">Customise the overall theme colour of SEQTA Learn.</p>
          </div>
          <div class="clr-field" style="justify-content: end; display: flex; margin: 5px;">
            <button aria-labelledby="clr-open-label" style="width: 51px; right: 0px; border: 1px solid white;"></button>
            <input type="text" id="colorpicker" class="coloris" style="width: 42px; border-radius: 3px;" />
          </div>
        </div>


        <div class="item-container" style="height: 2em; margin-top: 0px;">
          <div class="text-container">
            <h1 class="addonitem">BetterSEQTA+</h1>
          </div>
          <div class="onoffswitch" style="margin-bottom: 0px;"><input class="onoffswitch-checkbox notification" type="checkbox" id="onoff">
            <label for="onoff" class="onoffswitch-label"></label>
          </div>
        </div>

      </div>
    </div>
  </div>




  <div class="bottom-container">
    <div class="applychanges" id="applychanges" style="height: 25px;">
      <div style="margin-top:0px;">
      <h5>Unsaved Changes</h5>
      <h6>Click to apply.</h6>
      </div>
    </div>

    <div></div>

    <div style="position: absolute; bottom: 15px; right: 50px; color: rgb(177, 177, 177); display: flex; align-items:center;">
    <p style="margin: 0; margin-right: 5px; color: white;">Maintained by SethBurkart123 </p>
    <p style="margin: 0; cursor:pointer; padding: 4px 5px; background: #ff5f5f; color:#1a1a1a;font-weight: 500; border-radius: 10px;" id="whatsnewsettings">What's new in v${
  chrome.runtime.getManifest().version
}</p></div>
    <img src=${chrome.runtime.getURL("/popup/github.svg")} alt="" id="github">
  </div></div>`);
  document.body.append(Settings.firstChild);

  var container = document.getElementById("container");
  var extensionsettings = document.getElementById("ExtensionPopup");
  container.onclick = function () {
    if (!SettingsClicked) {
      extensionsettings.classList.add("hidden");
    }
    SettingsClicked = false;
  };
}

function ApplyDraggableFunctions() {
  var listItens = document.querySelectorAll(".draggable");
  [].forEach.call(listItens, function (item) {
    addEventsDragAndDrop(item);
  });
}

var dragSrcEl;

function dragStart(e) {
  this.style.opacity = "0.4";
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", this.innerHTML);
}

function dragEnter() {
  this.classList.add("over");
}

function dragLeave(e) {
  e.stopPropagation();
  this.classList.remove("over");
}

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  return false;
}

function dragDrop() {
  if (dragSrcEl != this) {
    const parentA = this.parentNode;
    const siblingA = this.nextSibling === dragSrcEl ? this : this.nextSibling;

    // Move `this` to before the `dragSrcEl`
    dragSrcEl.parentNode.insertBefore(this, dragSrcEl);

    // Move `dragSrcEl` to before the sibling of `this`
    parentA.insertBefore(dragSrcEl, siblingA);

    // Save position of all menu items
    let children = parentA.childNodes;
    // console.log(children)
    let listorder = [];

    for (let i = 0; i < children.length; i++) {
      const elm = children[i];
      listorder.push(elm.dataset.key);
    }

    chrome.storage.local.set({ menuorder: listorder });
  }
  return false;
}

function dragEnd() {
  var listItens = document.querySelectorAll(".draggable");
  [].forEach.call(listItens, function (item) {
    item.classList.remove("over");
  });
  this.style.opacity = "1";
}

function addEventsDragAndDrop(el) {
  el.addEventListener("dragstart", dragStart, false);
  el.addEventListener("dragenter", dragEnter, false);
  el.addEventListener("dragover", dragOver, false);
  el.addEventListener("dragleave", dragLeave, false);
  el.addEventListener("drop", dragDrop, false);
  el.addEventListener("dragend", dragEnd, false);
}

function cloneAttributes(target, source) {
  [...source.attributes].forEach((attr) => {
    target.setAttribute(attr.nodeName, attr.nodeValue);
  });
}

function OpenMenuOptions() {
  chrome.storage.local.get(null, function (result) {
    var container = document.getElementById("container");
    var menu = document.getElementById("menu");

    if (result.defaultmenuorder.length == "0") {
      let childnodes = menu.firstChild.childNodes;
      let newdefaultmenuorder = [];
      for (let i = 0; i < childnodes.length; i++) {
        const element = childnodes[i];
        newdefaultmenuorder.push(element.dataset.key);
        chrome.storage.local.set({ defaultmenuorder: newdefaultmenuorder });
      }
    }
    let childnodes = menu.firstChild.childNodes;
    if (result.defaultmenuorder.length != childnodes.length) {
      for (let i = 0; i < childnodes.length; i++) {
        const element = childnodes[i];
        if (!result.defaultmenuorder.indexOf(element.dataset.key)) {
          let newdefaultmenuorder = result.defaultmenuorder;
          newdefaultmenuorder.push(element.dataset.key);
          chrome.storage.local.set({ defaultmenuorder: newdefaultmenuorder });
        }
      }
    }

    MenuOptionsOpen = true;

    let cover = document.createElement("div");
    cover.classList.add("notMenuCover");
    menu.style.zIndex = "20";
    menu.style.setProperty("--menuHidden", "flex");
    container.append(cover);

    let menusettings = document.createElement("div");
    menusettings.classList.add("editmenuoption-container");

    let defaultbutton = document.createElement("div");
    defaultbutton.classList.add("editmenuoption");
    defaultbutton.innerText = "Restore Default";
    defaultbutton.id = "restoredefaultoption";

    let savebutton = document.createElement("div");
    savebutton.classList.add("editmenuoption");
    savebutton.innerText = "Save";
    savebutton.id = "restoredefaultoption";

    menusettings.appendChild(defaultbutton);
    menusettings.appendChild(savebutton);

    menu.appendChild(menusettings);

    let ListItems = menu.firstChild.childNodes;
    for (let i = 0; i < ListItems.length; i++) {
      const element = ListItems[i];

      element.classList.add("draggable");
      element.setAttribute("draggable", true);
      if (element.classList.contains("hasChildren")) {
        element.classList.remove("active");
        menu.firstChild.classList.remove("noscroll");
      }

      let MenuItemToggle = stringToHTML(
        `<div class="onoffswitch" style="margin: auto 0;"><input class="onoffswitch-checkbox notification menuitem" type="checkbox" id="${element.dataset.key}"><label for="${element.dataset.key}" class="onoffswitch-label"></label>`,
      ).firstChild;
      element.append(MenuItemToggle);

      if (!element.dataset.betterseqta) {
        var a = document.createElement("section");
        a.innerHTML = element.innerHTML;
        cloneAttributes(a, element);
        menu.firstChild.insertBefore(a, element);
        element.remove();
      }
    }

    if (Object.keys(result.menuitems).length == 0) {
      menubuttons = menu.firstChild.childNodes;
      var menuItems = {};
      for (var i = 0; i < menubuttons.length; i++) {
        var id = menubuttons[i].dataset.key;
        const element = {};
        element.toggle = true;
        menuItems[id] = element;
      }
      chrome.storage.local.set({ menuitems: menuItems });
    }

    var menubuttons = document.getElementsByClassName("menuitem");
    chrome.storage.local.get(["menuitems"], function (result) {
      var menuItems = result.menuitems;
      let buttons = document.getElementsByClassName("menuitem");
      for (var i = 0; i < buttons.length; i++) {
        var id = buttons[i].id;
        if (menuItems[id]) {
          buttons[i].checked = menuItems[id].toggle;
        }
        if (!menuItems[id]) {
          buttons[i].checked = true;
        }
      }
    });

    ApplyDraggableFunctions();

    function StoreMenuSettings() {
      chrome.storage.local.get(["menuitems"], function () {
        var menuItems = {};
        menubuttons = menu.firstChild.childNodes;
        let button = document.getElementsByClassName("menuitem");
        for (var i = 0; i < menubuttons.length; i++) {
          var id = menubuttons[i].dataset.key;
          const element = {};
          element.toggle = button[i].checked;

          menuItems[id] = element;
        }
        chrome.storage.local.set({ menuitems: menuItems });
      });
    }

    function changeDisplayProperty(element) {
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

    for (let i = 0; i < menubuttons.length; i++) {
      const element = menubuttons[i];
      element.addEventListener("change", () => {
        StoreMenuSettings();
        changeDisplayProperty(element);
      });
    }

    function closeAll() {
      ListItems = menu.firstChild.childNodes;
      menusettings.remove();
      cover.remove();
      MenuOptionsOpen = false;
      menu.style.setProperty("--menuHidden", "none");

      for (let i = 0; i < ListItems.length; i++) {
        const element = ListItems[i];
        element.classList.remove("draggable");
        element.setAttribute("draggable", false);

        if (!element.dataset.betterseqta) {
          var a = document.createElement("li");
          a.innerHTML = element.innerHTML;
          cloneAttributes(a, element);
          menu.firstChild.insertBefore(a, element);
          element.remove();
        }
      }

      let switches = menu.querySelectorAll(".onoffswitch");
      for (let i = 0; i < switches.length; i++) {
        switches[i].remove();
      }

      StoreMenuSettings();
    }

    cover.addEventListener("click", closeAll);
    savebutton.addEventListener("click", closeAll);

    defaultbutton.addEventListener("click", function () {
      chrome.storage.local.get(null, function (response) {
        const options = response.defaultmenuorder;
        chrome.storage.local.set({ menuorder: options });
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
        StoreMenuSettings();
      });
    });
  });
}

function ReplaceMenuSVG(element, svg) {
  let item = element.firstChild;
  item.firstChild.remove();

  if (element.dataset.key == "messages") {
    element.firstChild.innerText = "Direct Messages";
  }

  let newsvg = stringToHTML(svg).firstChild;
  item.insertBefore(newsvg, item.firstChild);
}

function AddBetterSEQTAElements(toggle) {
  var code = document.getElementsByClassName("code")[0];
  // Replaces students code with the version of BetterSEQTA
  if (code != null) {
    if (!code.innerHTML.includes("BetterSEQTA")) {
      UserInitalCode = code.innerText;
      code.innerText = `BetterSEQTA v${chrome.runtime.getManifest().version}`;
      code.setAttribute("data-hover", "Click for user code");
      code.addEventListener("click", function () {
        var code = document.getElementsByClassName("code")[0];
        if (code.innerText.includes("BetterSEQTA")) {
          code.innerText = UserInitalCode;
          code.setAttribute("data-hover", "Click for BetterSEQTA version");
        } else {
          code.innerText = `BetterSEQTA v${
            chrome.runtime.getManifest().version
          }`;
          code.setAttribute("data-hover", "Click for user code");
        }
      });
      if (toggle) {
        // Creates Home menu button and appends it as the first child of the list

        const result = chrome.storage.local.get(["animatedbk"]);
        const sliderVal = chrome.storage.local.get(["bksliderinput"]);

        result.then(animbkEnable);
        sliderVal.then(bkValues);

        // Load darkmode state
        chrome.storage.local.get(["DarkMode"], function (result) {
          DarkMode = result.DarkMode;
        });

        var titlebar = document.createElement("div");
        titlebar.classList.add("titlebar");
        let container = document.getElementById("content");
        container.append(titlebar);
        var NewButtonStr = "<li class=\"item\" data-key=\"home\" id=\"homebutton\" data-path=\"/home\" data-betterseqta=\"true\"><label><svg style=\"width:24px;height:24px\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z\" /></svg><span>Home</span></label></li>";
        var NewButton = stringToHTML(NewButtonStr);
        var menu = document.getElementById("menu");
        var List = menu.firstChild;
        List.insertBefore(NewButton.firstChild, List.firstChild);

        fetch(`${location.origin}/seqta/student/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            mode: "normal",
            query: null,
            redirect_url: location.origin,
          }),
        })
          .then((result) => result.json())
          .then((response) => {
            let info = response.payload;

            var titlebar = document.getElementsByClassName("titlebar")[0];
            titlebar.append(
              stringToHTML(
                "<div class=\"userInfosvgdiv tooltip\"><svg class=\"userInfosvg\" viewBox=\"0 0 24 24\"><path fill=\"var(--text-primary)\" d=\"M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z\"></path></svg><div class=\"tooltiptext topmenutooltip\" id=\"logouttooltip\"></div></div>",
              ).firstChild,
            );
            var userinfostr = `<div class="userInfo"><div class="userInfoText"><div style="display: flex; align-items: center;"><p class="userInfohouse userInfoCode"></p><p class="userInfoName">${info.userDesc}</p></div><p class="userInfoCode">${UserInitalCode}</p></div></div>`;
            var userinfo = stringToHTML(userinfostr).firstChild;

            titlebar.append(userinfo);

            var logoutbutton = document.getElementsByClassName("logout")[0];
            var userInfosvgdiv = document.getElementById("logouttooltip");
            userInfosvgdiv.appendChild(logoutbutton);

            fetch(`${location.origin}/seqta/student/load/message/people`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json; charset=utf-8",
              },
              body: JSON.stringify({ mode: "student" }),
            })
              .then((result) => result.json())
              .then((response) => {
                let students = response.payload;
                var index = students.findIndex(function (person) {
                  return (
                    person.firstname == info.userDesc.split(" ")[0] &&
                    person.surname == info.userDesc.split(" ")[1]
                  );
                });

                let houseelement =
                  document.getElementsByClassName("userInfohouse")[0];
                if (students[index]?.house) {
                  houseelement.style.background = students[index].house_colour;
                  try {
                    let colorresult = GetThresholdofHex(
                      students[index]?.house_colour,
                    );

                    if (colorresult > 300) {
                      houseelement.style.color = "black";
                    } else {
                      houseelement.style.color = "white";
                    }
                    houseelement.innerText =
                      students[index].year + students[index].house;
                  } catch(e) {
                    console.log(e);
                  }
                } else {
                  houseelement.innerText = students[index].year;
                }
              });
          });

        var NewsButtonStr = "<li class=\"item\" data-key=\"news\" id=\"newsbutton\" data-path=\"/news\" data-betterseqta=\"true\"><label><svg style=\"width:24px;height:24px\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M20 3H4C2.89 3 2 3.89 2 5V19C2 20.11 2.89 21 4 21H20C21.11 21 22 20.11 22 19V5C22 3.89 21.11 3 20 3M5 7H10V13H5V7M19 17H5V15H19V17M19 13H12V11H19V13M19 9H12V7H19V9Z\" /></svg>News</label></li>";
        var NewsButton = stringToHTML(NewsButtonStr);
        List.appendChild(NewsButton.firstChild);

        editmenu = document.createElement("div");
        editmenu.classList.add("editmenu");

        let svg = stringToHTML(
          "<svg style=\"width:24px;height:24px;padding:5px;\" id=\"editmenu\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z\" /></svg>",
        );
        editmenu.append(svg.firstChild);

        menu.appendChild(editmenu);

        let a = document.createElement("div");
        a.classList.add("icon-cover");
        a.id = "icon-cover";
        menu.appendChild(a);

        var editmenu = document.querySelector("#editmenu");
        editmenu.addEventListener("click", function () {
          if (!MenuOptionsOpen) {
            OpenMenuOptions();
          }
        });

        var menuCover = document.querySelector("#icon-cover");
        menuCover.addEventListener("click", function () {
          location.href = "../#?page=/home";
          SendHomePage();
          document
            .getElementById("menu")
            .firstChild.classList.remove("noscroll");
        });
        // Creates the home container when the menu button is pressed
        var homebutton = document.getElementById("homebutton");
        homebutton.addEventListener("click", function () {
          if (!MenuOptionsOpen) {
            SendHomePage();
          }
        });

        // Creates the news container when the menu button is pressed
        var newsbutton = document.getElementById("newsbutton");
        newsbutton.addEventListener("click", function () {
          if (!MenuOptionsOpen) {
            SendNewsPage();
          }
        });
      }

      CallExtensionSettings();
      RunExtensionSettingsJS();

      if (toggle) {
        // Creates settings and dashboard buttons next to alerts
        var SettingsButton = stringToHTML(
          "<button class=\"addedButton tooltip\" id=\"AddedSettings\"\"><svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><g><g><path d=\"M23.182,6.923c-.29,0-3.662,2.122-4.142,2.4l-2.8-1.555V4.511l4.257-2.456a.518.518,0,0,0,.233-.408.479.479,0,0,0-.233-.407,6.511,6.511,0,1,0-3.327,12.107,6.582,6.582,0,0,0,6.148-4.374,5.228,5.228,0,0,0,.333-1.542A.461.461,0,0,0,23.182,6.923Z\"></path><path d=\"M9.73,10.418,7.376,12.883c-.01.01-.021.016-.03.025L1.158,19.1a2.682,2.682,0,1,0,3.793,3.793l4.583-4.582,0,0,4.1-4.005-.037-.037A9.094,9.094,0,0,1,9.73,10.418ZM3.053,21.888A.894.894,0,1,1,3.946,21,.893.893,0,0,1,3.053,21.888Z\"></path></g></g></svg><div class=\"tooltiptext topmenutooltip\">BetterSEQTA Settings</div></button>",
        );
        var ContentDiv = document.getElementById("content");
        ContentDiv.append(SettingsButton.firstChild);

        chrome.storage.local.get(["DarkMode"], function (result) {
          DarkMode = result.DarkMode;

          let tooltipstring = GetLightDarkModeString(DarkMode);
          var LightDarkModeButton = stringToHTML(
            String.raw`<button class="addedButton DarkLightButton tooltip" id="LightDarkModeButton"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" style="width: 100%; height: 100%; transform: translate3d(0px, 0px, 0px);" preserveAspectRatio="xMidYMid meet"></svg><div class="tooltiptext topmenutooltip" id="darklighttooliptext">${tooltipstring}</div></button>`,
          );
          ContentDiv.append(LightDarkModeButton.firstChild);

          let LightDarkModeElement = document.getElementById("LightDarkModeButton");

          if (DarkMode) {
            LightDarkModeElement.firstChild.innerHTML = "<defs><clipPath id=\"__lottie_element_80\"><rect width=\"24\" height=\"24\" x=\"0\" y=\"0\"></rect></clipPath></defs><g clip-path=\"url(#__lottie_element_80)\"><g style=\"display: block;\" transform=\"matrix(1,0,0,1,12,12)\" opacity=\"1\"><g opacity=\"1\" transform=\"matrix(1,0,0,1,0,0)\"><path fill-opacity=\"1\" d=\" M0,-4 C-2.2100000381469727,-4 -4,-2.2100000381469727 -4,0 C-4,2.2100000381469727 -2.2100000381469727,4 0,4 C2.2100000381469727,4 4,2.2100000381469727 4,0 C4,-2.2100000381469727 2.2100000381469727,-4 0,-4z\"></path></g></g><g style=\"display: block;\" transform=\"matrix(1,0,0,1,12,12)\" opacity=\"1\"><g opacity=\"1\" transform=\"matrix(1,0,0,1,0,0)\"><path fill-opacity=\"1\" d=\" M0,6 C-3.309999942779541,6 -6,3.309999942779541 -6,0 C-6,-3.309999942779541 -3.309999942779541,-6 0,-6 C3.309999942779541,-6 6,-3.309999942779541 6,0 C6,3.309999942779541 3.309999942779541,6 0,6z M8,-3.309999942779541 C8,-3.309999942779541 8,-8 8,-8 C8,-8 3.309999942779541,-8 3.309999942779541,-8 C3.309999942779541,-8 0,-11.3100004196167 0,-11.3100004196167 C0,-11.3100004196167 -3.309999942779541,-8 -3.309999942779541,-8 C-3.309999942779541,-8 -8,-8 -8,-8 C-8,-8 -8,-3.309999942779541 -8,-3.309999942779541 C-8,-3.309999942779541 -11.3100004196167,0 -11.3100004196167,0 C-11.3100004196167,0 -8,3.309999942779541 -8,3.309999942779541 C-8,3.309999942779541 -8,8 -8,8 C-8,8 -3.309999942779541,8 -3.309999942779541,8 C-3.309999942779541,8 0,11.3100004196167 0,11.3100004196167 C0,11.3100004196167 3.309999942779541,8 3.309999942779541,8 C3.309999942779541,8 8,8 8,8 C8,8 8,3.309999942779541 8,3.309999942779541 C8,3.309999942779541 11.3100004196167,0 11.3100004196167,0 C11.3100004196167,0 8,-3.309999942779541 8,-3.309999942779541z\"></path></g></g></g>";
            document.documentElement.style.removeProperty("--better-pale");
          } else {
            LightDarkModeElement.firstChild.innerHTML = "<defs><clipPath id=\"__lottie_element_263\"><rect width=\"24\" height=\"24\" x=\"0\" y=\"0\"></rect></clipPath></defs><g clip-path=\"url(#__lottie_element_263)\"><g style=\"display: block;\" transform=\"matrix(1.5,0,0,1.5,7,12)\" opacity=\"1\"><g opacity=\"1\" transform=\"matrix(1,0,0,1,0,0)\"><path fill-opacity=\"1\" d=\" M0,-4 C-2.2100000381469727,-4 -1.2920000553131104,-2.2100000381469727 -1.2920000553131104,0 C-1.2920000553131104,2.2100000381469727 -2.2100000381469727,4 0,4 C2.2100000381469727,4 4,2.2100000381469727 4,0 C4,-2.2100000381469727 2.2100000381469727,-4 0,-4z\"></path></g></g><g style=\"display: block;\" transform=\"matrix(-1,0,0,-1,12,12)\" opacity=\"1\"><g opacity=\"1\" transform=\"matrix(1,0,0,1,0,0)\"><path fill-opacity=\"1\" d=\" M0,6 C-3.309999942779541,6 -6,3.309999942779541 -6,0 C-6,-3.309999942779541 -3.309999942779541,-6 0,-6 C3.309999942779541,-6 6,-3.309999942779541 6,0 C6,3.309999942779541 3.309999942779541,6 0,6z M8,-3.309999942779541 C8,-3.309999942779541 8,-8 8,-8 C8,-8 3.309999942779541,-8 3.309999942779541,-8 C3.309999942779541,-8 0,-11.3100004196167 0,-11.3100004196167 C0,-11.3100004196167 -3.309999942779541,-8 -3.309999942779541,-8 C-3.309999942779541,-8 -8,-8 -8,-8 C-8,-8 -8,-3.309999942779541 -8,-3.309999942779541 C-8,-3.309999942779541 -11.3100004196167,0 -11.3100004196167,0 C-11.3100004196167,0 -8,3.309999942779541 -8,3.309999942779541 C-8,3.309999942779541 -8,8 -8,8 C-8,8 -3.309999942779541,8 -3.309999942779541,8 C-3.309999942779541,8 0,11.3100004196167 0,11.3100004196167 C0,11.3100004196167 3.309999942779541,8 3.309999942779541,8 C3.309999942779541,8 8,8 8,8 C8,8 8,3.309999942779541 8,3.309999942779541 C8,3.309999942779541 11.3100004196167,0 11.3100004196167,0 C11.3100004196167,0 8,-3.309999942779541 8,-3.309999942779541z\"></path></g></g></g>";
            try {
              chrome.storage.local.get(null, function (result) {
                document.documentElement.style.setProperty(
                  "--better-pale",
                  lightenAndPaleColor(result.selectedColor),
                );
              });
            } catch (err) {
              console.log(err);
            }
          }
          let darklightText = document.getElementById("darklighttooliptext");
          LightDarkModeElement.addEventListener("click", function () {
            chrome.storage.local.get(["DarkMode"], function (result) {
              DarkMode = result.DarkMode;
              let alliframes = document.getElementsByTagName("iframe");
              let fileref = GetiFrameCSSElement();

              if (!DarkMode) {
                document.documentElement.style.setProperty(
                  "--background-primary",
                  "#232323",
                );
                document.documentElement.style.setProperty(
                  "--background-secondary",
                  "#1a1a1a",
                );
                document.documentElement.style.setProperty(
                  "--text-primary",
                  "white",
                );
                document.documentElement.style.removeProperty("--better-pale");
                LightDarkModeElement.firstChild.innerHTML = "<defs><clipPath id=\"__lottie_element_80\"><rect width=\"24\" height=\"24\" x=\"0\" y=\"0\"></rect></clipPath></defs><g clip-path=\"url(#__lottie_element_80)\"><g style=\"display: block;\" transform=\"matrix(1,0,0,1,12,12)\" opacity=\"1\"><g opacity=\"1\" transform=\"matrix(1,0,0,1,0,0)\"><path fill-opacity=\"1\" d=\" M0,-4 C-2.2100000381469727,-4 -4,-2.2100000381469727 -4,0 C-4,2.2100000381469727 -2.2100000381469727,4 0,4 C2.2100000381469727,4 4,2.2100000381469727 4,0 C4,-2.2100000381469727 2.2100000381469727,-4 0,-4z\"></path></g></g><g style=\"display: block;\" transform=\"matrix(1,0,0,1,12,12)\" opacity=\"1\"><g opacity=\"1\" transform=\"matrix(1,0,0,1,0,0)\"><path fill-opacity=\"1\" d=\" M0,6 C-3.309999942779541,6 -6,3.309999942779541 -6,0 C-6,-3.309999942779541 -3.309999942779541,-6 0,-6 C3.309999942779541,-6 6,-3.309999942779541 6,0 C6,3.309999942779541 3.309999942779541,6 0,6z M8,-3.309999942779541 C8,-3.309999942779541 8,-8 8,-8 C8,-8 3.309999942779541,-8 3.309999942779541,-8 C3.309999942779541,-8 0,-11.3100004196167 0,-11.3100004196167 C0,-11.3100004196167 -3.309999942779541,-8 -3.309999942779541,-8 C-3.309999942779541,-8 -8,-8 -8,-8 C-8,-8 -8,-3.309999942779541 -8,-3.309999942779541 C-8,-3.309999942779541 -11.3100004196167,0 -11.3100004196167,0 C-11.3100004196167,0 -8,3.309999942779541 -8,3.309999942779541 C-8,3.309999942779541 -8,8 -8,8 C-8,8 -3.309999942779541,8 -3.309999942779541,8 C-3.309999942779541,8 0,11.3100004196167 0,11.3100004196167 C0,11.3100004196167 3.309999942779541,8 3.309999942779541,8 C3.309999942779541,8 8,8 8,8 C8,8 8,3.309999942779541 8,3.309999942779541 C8,3.309999942779541 11.3100004196167,0 11.3100004196167,0 C11.3100004196167,0 8,-3.309999942779541 8,-3.309999942779541z\"></path></g></g></g>";

                for (let i = 0; i < alliframes.length; i++) {
                  const element = alliframes[i];
                  element.contentDocument.documentElement.childNodes[1].style.color =
                    "white";
                  element.contentDocument.documentElement.firstChild.appendChild(
                    fileref,
                  );
                }
              } else {
                document.documentElement.style.setProperty(
                  "--background-primary",
                  "#ffffff",
                );
                document.documentElement.style.setProperty(
                  "--background-secondary",
                  "#e5e7eb",
                );
                document.documentElement.style.setProperty(
                  "--text-primary",
                  "black",
                );
                try {
                  chrome.storage.local.get(null, function (result) {
                    document.documentElement.style.setProperty(
                      "--better-pale",
                      lightenAndPaleColor(result.selectedColor),
                    );
                  });
                } catch (err) {
                  console.log(err);
                }
                LightDarkModeElement.firstChild.innerHTML = "<defs><clipPath id=\"__lottie_element_263\"><rect width=\"24\" height=\"24\" x=\"0\" y=\"0\"></rect></clipPath></defs><g clip-path=\"url(#__lottie_element_263)\"><g style=\"display: block;\" transform=\"matrix(1.5,0,0,1.5,7,12)\" opacity=\"1\"><g opacity=\"1\" transform=\"matrix(1,0,0,1,0,0)\"><path fill-opacity=\"1\" d=\" M0,-4 C-2.2100000381469727,-4 -1.2920000553131104,-2.2100000381469727 -1.2920000553131104,0 C-1.2920000553131104,2.2100000381469727 -2.2100000381469727,4 0,4 C2.2100000381469727,4 4,2.2100000381469727 4,0 C4,-2.2100000381469727 2.2100000381469727,-4 0,-4z\"></path></g></g><g style=\"display: block;\" transform=\"matrix(-1,0,0,-1,12,12)\" opacity=\"1\"><g opacity=\"1\" transform=\"matrix(1,0,0,1,0,0)\"><path fill-opacity=\"1\" d=\" M0,6 C-3.309999942779541,6 -6,3.309999942779541 -6,0 C-6,-3.309999942779541 -3.309999942779541,-6 0,-6 C3.309999942779541,-6 6,-3.309999942779541 6,0 C6,3.309999942779541 3.309999942779541,6 0,6z M8,-3.309999942779541 C8,-3.309999942779541 8,-8 8,-8 C8,-8 3.309999942779541,-8 3.309999942779541,-8 C3.309999942779541,-8 0,-11.3100004196167 0,-11.3100004196167 C0,-11.3100004196167 -3.309999942779541,-8 -3.309999942779541,-8 C-3.309999942779541,-8 -8,-8 -8,-8 C-8,-8 -8,-3.309999942779541 -8,-3.309999942779541 C-8,-3.309999942779541 -11.3100004196167,0 -11.3100004196167,0 C-11.3100004196167,0 -8,3.309999942779541 -8,3.309999942779541 C-8,3.309999942779541 -8,8 -8,8 C-8,8 -3.309999942779541,8 -3.309999942779541,8 C-3.309999942779541,8 0,11.3100004196167 0,11.3100004196167 C0,11.3100004196167 3.309999942779541,8 3.309999942779541,8 C3.309999942779541,8 8,8 8,8 C8,8 8,3.309999942779541 8,3.309999942779541 C8,3.309999942779541 11.3100004196167,0 11.3100004196167,0 C11.3100004196167,0 8,-3.309999942779541 8,-3.309999942779541z\"></path></g></g></g>";

                for (let i = 0; i < alliframes.length; i++) {
                  const element = alliframes[i];
                  element.contentDocument.documentElement.childNodes[1].style.color =
                    "black";
                  element.contentDocument.documentElement.firstChild.lastChild.remove();
                }
              }
              tooltipstring = GetLightDarkModeString(!result.DarkMode);
              darklightText.innerText = tooltipstring;
              chrome.storage.local.set({ DarkMode: !result.DarkMode });
            });
          });
        });
      } else {
        // Creates settings and dashboard buttons next to alerts
        SettingsButton = stringToHTML(
          "<button class=\"addedButton\" id=\"AddedSettings\"\"><svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><g style=\"fill: var(--text-color);\"><g><path d=\"M23.182,6.923c-.29,0-3.662,2.122-4.142,2.4l-2.8-1.555V4.511l4.257-2.456a.518.518,0,0,0,.233-.408.479.479,0,0,0-.233-.407,6.511,6.511,0,1,0-3.327,12.107,6.582,6.582,0,0,0,6.148-4.374,5.228,5.228,0,0,0,.333-1.542A.461.461,0,0,0,23.182,6.923Z\"></path><path d=\"M9.73,10.418,7.376,12.883c-.01.01-.021.016-.03.025L1.158,19.1a2.682,2.682,0,1,0,3.793,3.793l4.583-4.582,0,0,4.1-4.005-.037-.037A9.094,9.094,0,0,1,9.73,10.418ZM3.053,21.888A.894.894,0,1,1,3.946,21,.893.893,0,0,1,3.053,21.888Z\"></path></g></g></svg></button>",
        );
        ContentDiv = document.getElementById("content");
        ContentDiv.append(SettingsButton.firstChild);
      }

      var AddedSettings = document.getElementById("AddedSettings");
      var extensionsettings = document.getElementById("ExtensionPopup");
      AddedSettings.addEventListener("click", function () {
        extensionsettings.classList.toggle("hidden");
        SettingsClicked = true;
      });
    }
  }
}

let tooltipstring;

function GetLightDarkModeString(darkmodetoggle) {
  if (darkmodetoggle) {
    tooltipstring = "Switch to light theme";
  } else {
    tooltipstring = "Switch to dark theme";
  }
  return tooltipstring;
}

function CheckCurrentLesson(lesson, num) {
  var startTime = lesson.from;
  var endTime = lesson.until;
  // Gets current time
  let currentDate = new Date();

  // Takes start time of current lesson and makes it into a Date function for comparison
  let startDate = new Date(currentDate.getTime());
  startDate.setHours(startTime.split(":")[0]);
  startDate.setMinutes(startTime.split(":")[1]);
  startDate.setSeconds("00");

  // Takes end time of current lesson and makes it into a Date function for comparison
  let endDate = new Date(currentDate.getTime());
  endDate.setHours(endTime.split(":")[0]);
  endDate.setMinutes(endTime.split(":")[1]);
  endDate.setSeconds("00");

  // Gets the difference between the start time and current time
  var difference = startDate.getTime() - currentDate.getTime();
  // Converts the difference into minutes
  var minutes = Math.floor(difference / 1000 / 60);

  // Checks if current time is between the start time and end time of current tested lesson
  let valid = startDate < currentDate && endDate > currentDate;

  let id = lesson.code + num;
  const date = new Date();

  var elementA = document.getElementById(id);
  if (!elementA) {
    clearInterval(LessonInterval);
  } else {
    if (
      currentSelectedDate.toLocaleDateString("en-au") ==
      date.toLocaleDateString("en-au")
    ) {
      if (valid) {
        // Apply the activelesson class to increase the box-shadow of current lesson
        elementA.classList.add("activelesson");
      } else {
        // Removes the activelesson class to ensure only the active lesson have the class
        if (elementA != null) {
          elementA.classList.remove("activelesson");
        }
      }
    }
  }

  // If 5 minutes before the start of another lesson:
  if (minutes == 5) {
    chrome.storage.local.get("lessonalert", function (result) {
      if (result.lessonalert) {
        // Checks if notifications are supported
        if (!window.Notification) {
          console.log("Browser does not support notifications.");
        } else {
          // check if permission is already granted
          if (Notification.permission === "granted") {
            // show notification here
          } else {
            // request permission from user
            Notification.requestPermission()
              .then(function (p) {
                if (p === "granted") {
                  // show notification here
                  /* notify = new Notification("Next Lesson in 5 Minutes:", {
                    body:
                      "Subject: " +
                      lesson.description +
                      " \nRoom: " +
                      lesson.room +
                      " \nTeacher: " +
                      lesson.staff,
                  }); */
                } else {
                  console.log("User blocked notifications.");
                }
              })
              .catch(function (err) {
                console.error(err);
              });
          }
        }
      }
    });
  }
}

function hexToRGB(hex) {
  try {
    var r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);

    return { r: r, g: g, b: b };
  } catch {
    // do nothing becuase this functoin is a bit broken right now (feel free to fix it!)
  }
}

function GetThresholdofHex(hex) {
  var rgb = hexToRGB(hex);
  return Math.sqrt(rgb.r ** 2 + rgb.g ** 2 + rgb.b ** 2);
}

function CheckCurrentLessonAll(lessons) {
  // Checks each lesson and sets an interval to run every 60 seconds to continue updating
  LessonInterval = setInterval(
    function () {
      for (let i = 0; i < lessons.length; i++) {
        CheckCurrentLesson(lessons[i], i + 1);
      }
    }.bind(lessons),
    60000,
  );
}

function MakeLessonDiv(lesson, num) {
  let assessmentstring = "";
  var lessonstring = `<div class="day" id=${lesson.code + num} style="${
    lesson.colour
  }"><h2>${lesson?.description ?? "Unknown"}</h2><h3>${
    lesson?.staff ?? "Unknown"
  }</h3><h3>${lesson?.room ?? "Unknown"}</h3><h4>${
    lesson?.from ?? "Unknown"
  } - ${lesson?.until ?? "Unknown"}</h4><h5>${
    lesson?.attendanceTitle ?? "Unknown"
  }</h5>`;

  if (lesson.programmeID != 0) {
    lessonstring += `<div class="day-button clickable" style="right: 5px;" onclick="location.href='../#?page=/assessments/${lesson.programmeID}:${lesson.metaID}'">${assessmentsicon}</div><div class="day-button clickable" style="right: 35px;" onclick="location.href='../#?page=/courses/${lesson.programmeID}:${lesson.metaID}'">${coursesicon}</div>`;
  }

  if (lesson.assessments.length > 0) {
    for (let i = 0; i < lesson.assessments.length; i++) {
      const element = lesson.assessments[i];
      assessmentstring += `<p onclick="location.href = '../#?page=/assessments/${lesson.programmeID}:${lesson.metaID}&item=${element.id}';">${element.title}</p>`;
    }
    lessonstring += `<div class="tooltip assessmenttooltip"><svg style="width:28px;height:28px;border-radius:0;" viewBox="0 0 24 24">
    <path fill="#ed3939" d="M16 2H4C2.9 2 2 2.9 2 4V20C2 21.11 2.9 22 4 22H16C17.11 22 18 21.11 18 20V4C18 2.9 17.11 2 16 2M16 20H4V4H6V12L8.5 9.75L11 12V4H16V20M20 15H22V17H20V15M22 7V13H20V7H22Z" />
    </svg><div class="tooltiptext">${assessmentstring}</div></div>`;
  }
  lessonstring += "</div>";
  var lessondiv = stringToHTML(lessonstring);
  return lessondiv;
}

function CheckUnmarkedAttendance(lessonattendance) {
  if (lessonattendance) {
    var lesson = lessonattendance.label;
  } else {
    lesson = " ";
  }
  return lesson;
}

function callHomeTimetable(date, change) {
  // Creates a HTTP Post Request to the SEQTA page for the students timetable
  var xhr = new XMLHttpRequest();
  xhr.open("POST", `${location.origin}/seqta/student/load/timetable?`, true);
  // Sets the response type to json
  xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");

  xhr.onreadystatechange = function () {
    // Once the response is ready
    if (xhr.readyState === 4) {
      var serverResponse = JSON.parse(xhr.response);
      let lessonArray = [];
      var DayContainer = document.getElementById("day-container");
      // If items in response:
      if (serverResponse.payload.items.length > 0) {
        if (!DayContainer.innerText || change) {
          // console.log(serverResponse.payload.items.length);
          for (let i = 0; i < serverResponse.payload.items.length; i++) {
            lessonArray.push(serverResponse.payload.items[i]);
          }
          lessonArray.sort(function (a, b) {
            return a.from.localeCompare(b.from);
          });
          // If items in the response, set each corresponding value into divs
          // lessonArray = lessonArray.splice(1)
          GetLessonColours().then((colours) => {
            let subjects = colours;
            for (let i = 0; i < lessonArray.length; i++) {
              let subjectname = `timetable.subject.colour.${lessonArray[i].code}`;

              let subject = subjects.find(
                (element) => element.name === subjectname,
              );
              if (!subject) {
                lessonArray[i].colour = "--item-colour: #8e8e8e;";
              } else {
                lessonArray[i].colour = `--item-colour: ${subject.value};`;
                let result = GetThresholdofHex(subject.value);

                if (result > 300) {
                  lessonArray[i].invert = true;
                }
              }
              // Removes seconds from the start and end times
              lessonArray[i].from = lessonArray[i].from.substring(0, 5);
              lessonArray[i].until = lessonArray[i].until.substring(0, 5);

              // Checks if attendance is unmarked, and sets the string to " ".
              lessonArray[i].attendanceTitle = CheckUnmarkedAttendance(
                lessonArray[i].attendance,
              );
            }
            // If on home page, apply each lesson to HTML with information in each div
            DayContainer.innerText = "";
            for (let i = 0; i < lessonArray.length; i++) {
              var div = MakeLessonDiv(lessonArray[i], i + 1);
              // Append each of the lessons into the day-container
              if (lessonArray[i].invert) {
                div.firstChild.classList.add("day-inverted");
              }

              DayContainer.append(div.firstChild);
            }

            const today = new Date();
            if (currentSelectedDate.getDate() == today.getDate()) {
              for (let i = 0; i < lessonArray.length; i++) {
                CheckCurrentLesson(lessonArray[i], i + 1);
              }
              // For each lesson, check the start and end times
              CheckCurrentLessonAll(lessonArray);
            }
          });
        }
      } else {
        if (!DayContainer.innerText || change) {
          DayContainer.innerText = "";
          var dummyDay = document.createElement("div");
          dummyDay.classList.add("day-empty");
          let img = document.createElement("img");
          img.src = chrome.runtime.getURL("icons/betterseqta-light-icon.png");
          let text = document.createElement("p");
          text.innerText = "No lessons available.";
          dummyDay.append(img);
          dummyDay.append(text);
          DayContainer.append(dummyDay);
        }
      }
    }
  };
  xhr.send(
    JSON.stringify({
      // Information sent to SEQTA page as a request with the dates and student number
      from: date,
      until: date,
      // Funny number
      student: 69,
    }),
  );
}

function GetUpcomingAssessments() {
  let func = fetch(`${location.origin}/seqta/student/assessment/list/upcoming?`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ student: 69 }),
  });

  return func
    .then((result) => result.json())
    .then((response) => response.payload);
}

function GetActiveClasses() {
  let func = fetch(`${location.origin}/seqta/student/load/subjects?`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({}),
  });

  return func
    .then((result) => result.json())
    .then((response) => response.payload);
}

function comparedate(obj1, obj2) {
  if (obj1.date < obj2.date) {
    return -1;
  }
  if (obj1.date > obj2.date) {
    return 1;
  }
  return 0;
}

function CreateElement(type, class_, id, innerText, innerHTML, style) {
  let element = document.createElement(type);
  if (class_ !== undefined) {
    element.classList.add(class_);
  }
  if (id !== undefined) {
    element.id = id;
  }
  if (innerText !== undefined) {
    element.innerText = innerText;
  }
  if (innerHTML !== undefined) {
    element.innerHTML = innerHTML;
  }
  if (style !== undefined) {
    element.style = style;
  }
  return element;
}

function createAssessmentDateDiv(date, value, datecase = undefined) {
  var options = { weekday: "long", month: "long", day: "numeric" };
  const FormattedDate = new Date(date);

  const assessments = value.assessments;
  const container = value.div;

  let DateTitleDiv = document.createElement("div");
  DateTitleDiv.classList.add("upcoming-date-title");

  if (datecase) {
    let datetitle = document.createElement("h5");
    datetitle.classList.add("upcoming-special-day");
    datetitle.innerText = datecase;
    DateTitleDiv.append(datetitle);
    container.setAttribute("data-day", datecase);
  }

  let DateTitle = document.createElement("h5");
  DateTitle.innerText = FormattedDate.toLocaleDateString("en-AU", options);
  DateTitleDiv.append(DateTitle);

  container.append(DateTitleDiv);

  let assessmentContainer = document.createElement("div");
  assessmentContainer.classList.add("upcoming-date-assessments");

  for (let i = 0; i < assessments.length; i++) {
    const element = assessments[i];
    let item = document.createElement("div");
    item.classList.add("upcoming-assessment");
    item.setAttribute("data-subject", element.code);
    item.id = `assessment${element.id}`;

    item.style = element.colour;

    let titlediv = document.createElement("div");
    titlediv.classList.add("upcoming-subject-title");

    let titlesvg =
      stringToHTML(`<svg viewBox="0 0 24 24" style="width:35px;height:35px;fill:white;">
    <path d="M6 20H13V22H6C4.89 22 4 21.11 4 20V4C4 2.9 4.89 2 6 2H18C19.11 2 20 2.9 20 4V12.54L18.5 11.72L18 12V4H13V12L10.5 9.75L8 12V4H6V20M24 17L18.5 14L13 17L18.5 20L24 17M15 19.09V21.09L18.5 23L22 21.09V19.09L18.5 21L15 19.09Z"></path>
    </svg>`).firstChild;
    titlediv.append(titlesvg);

    let detailsdiv = document.createElement("div");
    detailsdiv.classList.add("upcoming-details");
    let detailstitle = document.createElement("h5");
    detailstitle.innerText = `${element.subject} assessment`;
    let subject = document.createElement("p");
    subject.innerText = element.title;
    subject.classList.add("upcoming-assessment-title");
    subject.onclick = function () {
      location.href = `../#?page=/assessments/${element.programmeID}:${element.metaclassID}&item=${element.id}`;
    };
    detailsdiv.append(detailstitle);
    detailsdiv.append(subject);

    item.append(titlediv);
    item.append(detailsdiv);
    assessmentContainer.append(item);

    fetch(`${location.origin}/seqta/student/assessment/submissions/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        assessment: element.id,
        metaclass: element.metaclassID,
        student: 69,
      }),
    })
      .then((result) => result.json())
      .then((response) => {
        if (response.payload.length > 0) {
          const assessment = document.querySelector(`#assessment${element.id}`);

          // ticksvg = stringToHTML(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="var(--item-colour)" viewBox="0 0 24 24"><path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/></svg>`).firstChild
          // ticksvg.classList.add('upcoming-tick');
          // assessment.append(ticksvg);
          let submittedtext = document.createElement("div");
          submittedtext.classList.add("upcoming-submittedtext");
          submittedtext.innerText = "Submitted";
          assessment.append(submittedtext);
        }
      });
  }

  container.append(assessmentContainer);

  return container;
}

function CheckSpecialDay(date1, date2) {
  if (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() - 1 === date2.getDate()
  ) {
    return "Yesterday";
  }
  if (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  ) {
    return "Today";
  }
  if (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() + 1 === date2.getDate()
  ) {
    return "Tomorrow";
  }
}

function CreateSubjectFilter(subjectcode, itemcolour, checked) {
  let label = CreateElement("label", "upcoming-checkbox-container");
  label.innerText = subjectcode;
  let input = CreateElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.id = `filter-${subjectcode}`;
  label.style = itemcolour;
  let span = CreateElement("span", "upcoming-checkmark");
  label.append(input);
  label.append(span);

  input.addEventListener("change", function (change) {
    chrome.storage.local.get(null, function (storage) {
      let filters = storage.subjectfilters;
      let id = change.target.id.split("-")[1];
      filters[id] = change.target.checked;

      chrome.storage.local.set({ subjectfilters: filters });
    });
  });

  return label;
}

function CreateFilters(subjects) {
  chrome.storage.local.get(null, function (result) {
    let filteroptions = result.subjectfilters;

    let filterdiv = document.querySelector("#upcoming-filters");
    for (let i = 0; i < subjects.length; i++) {
      const element = subjects[i];
      // eslint-disable-next-line
      if (!Object.prototype.hasOwnProperty.call(filteroptions, element.code)) {
        filteroptions[element.code] = true;
        chrome.storage.local.set({ subjectfilters: filteroptions });
      }
      let elementdiv = CreateSubjectFilter(
        element.code,
        element.colour,
        filteroptions[element.code],
      );

      filterdiv.append(elementdiv);
    }
  });
}

function CreateUpcomingSection(assessments) {
  let upcomingitemcontainer = document.querySelector("#upcoming-items");
  let overdueDates = [];
  let upcomingDates = {};

  // date = '2022/3/20';
  // var Today = new Date(date);

  var Today = new Date();

  // Removes overdue assessments from the upcoming assessments array and pushes to overdue array
  for (let i = 0; i < assessments.length; i++) {
    const element = assessments[i];
    let assessmentdue = new Date(element.due);

    CheckSpecialDay(Today, assessmentdue);
    if (assessmentdue < Today) {
      if (!CheckSpecialDay(Today, assessmentdue)) {
        overdueDates.push(element);
        assessments.splice(i, 1);
        i--;
      }
    }
  }

  var TomorrowDate = new Date();
  TomorrowDate.setDate(TomorrowDate.getDate() + 1);

  GetLessonColours().then((colours) => {
    let subjects = colours;
    for (let i = 0; i < assessments.length; i++) {
      let subjectname = `timetable.subject.colour.${assessments[i].code}`;

      let subject = subjects.find((element) => element.name === subjectname);
      if (!subject) {
        assessments[i].colour = "--item-colour: #8e8e8e;";
      } else {
        assessments[i].colour = `--item-colour: ${subject.value};`;
        GetThresholdofHex(subject.value); // result (originally) result = GetThresholdofHex
      }
    }

    let activeSubjects = []; // TODO: IDK what is going on here, but it didn't exist
    for (let i = 0; i < activeSubjects.length; i++) {
      const element = activeSubjects[i];
      let subjectname = `timetable.subject.colour.${element.code}`;
      let colour = colours.find((element) => element.name === subjectname);
      if (!colour) {
        element.colour = "--item-colour: #8e8e8e;";
      } else {
        element.colour = `--item-colour: ${colour.value};`;
        let result = GetThresholdofHex(colour.value);
        if (result > 300) {
          element.invert = true;
        }
      }
    }

    CreateFilters(activeSubjects);

    let type;
    let class_;

    for (let i = 0; i < assessments.length; i++) {
      const element = assessments[i];
      if (!upcomingDates[element.due]) {
        let dateObj = new Object();
        dateObj.div = CreateElement(
          // TODO: not sure whats going on here?
          // eslint-disable-next-line
          type = "div",
          // eslint-disable-next-line
          class_ = "upcoming-date-container",
        );
        dateObj.assessments = [];

        upcomingDates[element.due] = dateObj;
      }
      let assessmentDateDiv = upcomingDates[element.due];
      assessmentDateDiv.assessments.push(element);
    }

    for (var date in upcomingDates) {
      let assessmentdue = new Date(upcomingDates[date].assessments[0].due);
      let specialcase = CheckSpecialDay(Today, assessmentdue);
      let assessmentDate;
      let datecase;

      if (specialcase) {
        assessmentDate = createAssessmentDateDiv(
          date,
          upcomingDates[date],
          // eslint-disable-next-line
          datecase = specialcase,
        );
      } else {
        assessmentDate = createAssessmentDateDiv(date, upcomingDates[date]);
      }

      if (specialcase === "Yesterday") {
        upcomingitemcontainer.insertBefore(
          assessmentDate,
          upcomingitemcontainer.firstChild,
        );
      } else {
        upcomingitemcontainer.append(assessmentDate);
      }

    }
    chrome.storage.local.get(null, function (result) {
      FilterUpcomingAssessments(result.subjectfilters);
    });
  });
}

function AddPlaceHolderToParent(parent, numberofassessments) {
  let textcontainer = CreateElement("div", "upcoming-blank");
  let textblank = CreateElement("p", "upcoming-hiddenassessment");
  let s = "";
  if (numberofassessments > 1) {
    s = "s";
  }
  textblank.innerText = `${numberofassessments} hidden assessment${s} due`;
  textcontainer.append(textblank);
  textcontainer.setAttribute("data-hidden", true);

  parent.append(textcontainer);
}

function FilterUpcomingAssessments(subjectoptions) {
  for (var item in subjectoptions) {
    let subjectdivs = document.querySelectorAll(`[data-subject="${item}"]`);

    for (let i = 0; i < subjectdivs.length; i++) {
      const element = subjectdivs[i];

      if (!subjectoptions[item]) {
        element.classList.add("hidden");
      }
      if (subjectoptions[item]) {
        element.classList.remove("hidden");
      }
      element.parentNode.classList.remove("hidden");

      let children = element.parentNode.parentNode.children;
      for (let i = 0; i < children.length; i++) {
        const element = children[i];
        if (element.hasAttribute("data-hidden")) {
          element.remove();
        }
      }

      if (
        element.parentNode.children.length ==
        element.parentNode.querySelectorAll(".hidden").length
      ) {
        if (element.parentNode.querySelectorAll(".hidden").length > 0) {
          if (!element.parentNode.parentNode.hasAttribute("data-day")) {
            element.parentNode.parentNode.classList.add("hidden");
          } else {
            AddPlaceHolderToParent(
              element.parentNode.parentNode,
              element.parentNode.querySelectorAll(".hidden").length,
            );
          }
        }
      } else {
        element.parentNode.parentNode.classList.remove("hidden");
      }
    }
  }
}

chrome.storage.onChanged.addListener(function (changes) {
  if (changes.subjectfilters) {
    FilterUpcomingAssessments(changes.subjectfilters.newValue);
  }
});

function GetLessonColours() {
  let func = fetch(`${location.origin}/seqta/student/load/prefs?`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ request: "userPrefs", asArray: true, user: 69 }),
  });
  return func
    .then((result) => result.json())
    .then((response) => response.payload);
}

function CreateCustomShortcutDiv(element) {
  // Creates the stucture and element information for each seperate shortcut
  var shortcut = document.createElement("a");
  shortcut.setAttribute("href", element.url);
  shortcut.setAttribute("target", "_blank");
  var shortcutdiv = document.createElement("div");
  shortcutdiv.classList.add("shortcut");
  shortcutdiv.classList.add("customshortcut");

  let image = stringToHTML(
    `<svg viewBox="0 0 40 40" style="width:39px;height:39px"><text font-size="32" font-weight="bold" fill="var(--text-primary)" x="50%" y="50%" text-anchor="middle" dominant-baseline="central">${element.icon}</text></svg>`,
  ).firstChild;
  image.classList.add("shortcuticondiv");
  var text = document.createElement("p");
  text.textContent = element.name;
  shortcutdiv.append(image);
  shortcutdiv.append(text);
  shortcut.append(shortcutdiv);

  document.getElementById("shortcuts").append(shortcut);
}

function AddCustomShortcutsToPage() {
  chrome.storage.local.get(["customshortcuts"], function (result) {
    var customshortcuts = Object.values(result)[0];
    if (customshortcuts.length > 0) {
      document.getElementsByClassName("shortcut-container")[0].style.display =
        "block";
      for (let i = 0; i < customshortcuts.length; i++) {
        const element = customshortcuts[i];
        CreateCustomShortcutDiv(element);
      }
    }
  });
}

function SendHomePage() {
  setTimeout(function () {
    // Sends the html data for the home page
    console.log("[BetterSEQTA] Started Loading Home Page");
    document.title = "Home ― SEQTA Learn";
    var element = document.querySelector("[data-key=home]");

    // Apply the active class to indicate clicked on home button
    element.classList.add("active");

    // Remove all current elements in the main div to add new elements
    var main = document.getElementById("main");
    main.innerHTML = "";

    const titlediv = document.getElementById("title").firstChild;
    titlediv.innerText = "Home";
    document.querySelector("link[rel*=\"icon\"]").href =
      chrome.runtime.getURL("icons/icon-48.png");

    currentSelectedDate = new Date();

    // Creates the root of the home page added to the main div
    var htmlStr = "<div class=\"home-root\"><div class=\"home-container\" id=\"home-container\"></div></div>";

    var html = stringToHTML(htmlStr);
    // Appends the html file to main div
    // Note : firstChild of html is done due to needing to grab the body from the stringToHTML function
    main.append(html.firstChild);

    // Gets the current date
    const date = new Date();

    // Formats the current date used send a request for timetable and notices later
    var TodayFormatted =
      date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();

    // Replaces actual date with a selected date. Used for testing.
    // TodayFormatted = "2020-08-31";

    // Creates the shortcut container into the home container
    var ShortcutStr = "<div class=\"shortcut-container border\"><div class=\"shortcuts border\" id=\"shortcuts\"></div></div>";
    var Shortcut = stringToHTML(ShortcutStr);
    // Appends the shortcut container into the home container
    document.getElementById("home-container").append(Shortcut.firstChild);

    // Creates the container div for the timetable portion of the home page
    var TimetableStr = "<div class=\"timetable-container border\"><div class=\"home-subtitle\"><h2 id=\"home-lesson-subtitle\">Today's Lessons</h2><div class=\"timetable-arrows\"><svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" style=\"transform: scale(-1,1)\" id=\"home-timetable-back\"><g style=\"fill: currentcolor;\"><path d=\"M8.578 16.359l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z\"></path></g></svg><svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" id=\"home-timetable-forward\"><g style=\"fill: currentcolor;\"><path d=\"M8.578 16.359l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z\"></path></g></svg></div></div><div class=\"day-container\" id=\"day-container\"></div></div>";
    var Timetable = stringToHTML(TimetableStr);
    // Appends the timetable container into the home container
    document.getElementById("home-container").append(Timetable.firstChild);

    var timetablearrowback = document.getElementById("home-timetable-back");
    var timetablearrowforward = document.getElementById(
      "home-timetable-forward",
    );

    function SetTimetableSubtitle() {
      var homelessonsubtitle = document.getElementById("home-lesson-subtitle");
      const date = new Date();
      if (
        date.getYear() == currentSelectedDate.getYear() &&
        date.getMonth() == currentSelectedDate.getMonth()
      ) {
        if (date.getDate() == currentSelectedDate.getDate()) {
          // Change text to Today's Lessons
          homelessonsubtitle.innerText = "Today's Lessons";
        } else if (date.getDate() - 1 == currentSelectedDate.getDate()) {
          // Change text to Yesterday's Lessons
          homelessonsubtitle.innerText = "Yesterday's Lessons";
        } else if (date.getDate() + 1 == currentSelectedDate.getDate()) {
          // Change text to Tomorrow's Lessons
          homelessonsubtitle.innerText = "Tomorrow's Lessons";
        } else {
          // Change text to date of the day
          homelessonsubtitle.innerText = `${currentSelectedDate.toLocaleString(
            "en-us",
            { weekday: "short" },
          )} ${currentSelectedDate.toLocaleDateString("en-au")}`;
        }
      } else {
        // Change text to date of the day
        homelessonsubtitle.innerText = `${currentSelectedDate.toLocaleString(
          "en-us",
          { weekday: "short" },
        )} ${currentSelectedDate.toLocaleDateString("en-au")}`;
      }
    }

    function changeTimetable(value) {
      currentSelectedDate.setDate(currentSelectedDate.getDate() + value);
      let FormattedDate =
        currentSelectedDate.getFullYear() +
        "-" +
        (currentSelectedDate.getMonth() + 1) +
        "-" +
        currentSelectedDate.getDate();
      callHomeTimetable(FormattedDate, true);
      SetTimetableSubtitle();
    }

    timetablearrowback.addEventListener("click", function () {
      changeTimetable(-1);
    });
    timetablearrowforward.addEventListener("click", function () {
      changeTimetable(1);
    });

    function createNewShortcut(link, icon, viewBox, title) {
      // Creates the stucture and element information for each seperate shortcut
      var shortcut = document.createElement("a");
      shortcut.setAttribute("href", link);
      shortcut.setAttribute("target", "_blank");
      var shortcutdiv = document.createElement("div");
      shortcutdiv.classList.add("shortcut");

      let image = stringToHTML(
        `<svg style="width:39px;height:39px" viewBox="${viewBox}"><path fill="currentColor" d="${icon}" /></svg>`,
      ).firstChild;
      image.classList.add("shortcuticondiv");
      var text = document.createElement("p");
      text.textContent = title;
      shortcutdiv.append(image);
      shortcutdiv.append(text);
      shortcut.append(shortcutdiv);

      document.getElementById("shortcuts").append(shortcut);
    }
    // Adds the shortcuts to the shortcut container
    chrome.storage.local.get(["shortcuts"], function (result) {
      var shortcuts = Object.values(result)[0];
      for (let i = 0; i < shortcuts.length; i++) {
        if (shortcuts[i].enabled) {
          let Itemname = shortcuts[i].name.replace(/ /g, "");
          createNewShortcut(
            ShortcutLinks[Itemname].link,
            ShortcutLinks[Itemname].icon,
            ShortcutLinks[Itemname].viewBox,
            shortcuts[i].name,
          );
        }
      }
      AddCustomShortcutsToPage();

      // Checks if shortcut container is empty
      if (document.getElementById("shortcuts").childElementCount == 0) {
        // If there are no shortcuts, hide the container
        document.getElementsByClassName("shortcut-container")[0].style.display =
          "none";
      }
    });

    // Creates the upcoming container and appends to the home container
    var upcomingcontainer = document.createElement("div");
    upcomingcontainer.classList.add("upcoming-container");
    upcomingcontainer.classList.add("border");

    let upcomingtitlediv = CreateElement("div", "upcoming-title");
    let upcomingtitle = document.createElement("h2");
    upcomingtitle.classList.add("home-subtitle");
    upcomingtitle.innerText = "Upcoming Assessments";
    upcomingtitlediv.append(upcomingtitle);

    let upcomingfilterdiv = CreateElement(
      "div",
      "upcoming-filters",
      "upcoming-filters",
    );
    upcomingtitlediv.append(upcomingfilterdiv);

    upcomingcontainer.append(upcomingtitlediv);

    let upcomingitems = document.createElement("div");
    upcomingitems.id = "upcoming-items";
    upcomingitems.classList.add("upcoming-items");

    upcomingcontainer.append(upcomingitems);

    document.getElementById("home-container").append(upcomingcontainer);

    // Creates the notices container into the home container
    var NoticesStr = "<div class=\"notices-container border\"><h2 class=\"home-subtitle\">Notices</h2><div class=\"notice-container\" id=\"notice-container\"></div></div>";
    var Notices = stringToHTML(NoticesStr);
    // Appends the shortcut container into the home container
    document.getElementById("home-container").append(Notices.firstChild);

    callHomeTimetable(TodayFormatted);

    // Sends similar HTTP Post Request for the notices
    var xhr2 = new XMLHttpRequest();
    xhr2.open("POST", `${location.origin}/seqta/student/load/notices?`, true);
    xhr2.setRequestHeader("Content-Type", "application/json; charset=utf-8");

    xhr2.onreadystatechange = function () {
      if (xhr2.readyState === 4) {
        var NoticesPayload = JSON.parse(xhr2.response);
        var NoticeContainer = document.getElementById("notice-container");
        if (NoticesPayload.payload.length == 0) {
          if (!NoticeContainer.innerText) {
            // If no notices: display no notices
            var dummyNotice = document.createElement("div");
            dummyNotice.textContent = "No notices for today.";
            dummyNotice.classList.add("dummynotice");
            NoticeContainer.append(dummyNotice);
          }
        } else {
          if (!NoticeContainer.innerText) {
            // For each element in the response json:
            chrome.storage.local.get(["DarkMode"], function (result) {
              DarkMode = result.DarkMode;
              for (let i = 0; i < NoticesPayload.payload.length; i++) {
                // Create a div, and place information from json response
                var NewNotice = document.createElement("div");
                NewNotice.classList.add("notice");
                var title = stringToHTML(
                  "<h3 style=\"color:var(--colour)\">" +
                    NoticesPayload.payload[i].title +
                    "</h3>",
                );
                NewNotice.append(title.firstChild);

                if (NoticesPayload.payload[i].label_title != undefined) {
                  var label = stringToHTML(
                    "<h5 style=\"color:var(--colour)\">" +
                      NoticesPayload.payload[i].label_title +
                      "</h5>",
                  );
                  NewNotice.append(label.firstChild);
                }

                var staff = stringToHTML(
                  "<h6 style=\"color:var(--colour)\">" +
                    NoticesPayload.payload[i].staff +
                    "</h6>",
                );
                NewNotice.append(staff.firstChild);
                // Converts the string into HTML
                let styles;
                var content = stringToHTML(
                  NoticesPayload.payload[i].contents,
                  // eslint-disable-next-line
                  styles = true,
                );
                for (let i = 0; i < content.childNodes.length; i++) {
                  NewNotice.append(content.childNodes[i]);
                }
                // Gets the colour for the top section of each notice

                var colour = NoticesPayload.payload[i].colour;
                if (typeof colour == "string") {
                  let rgb = GetThresholdofHex(colour);
                  if (rgb < 100 && result.DarkMode) {
                    colour = undefined;
                  }
                }

                var colourbar = document.createElement("div");
                colourbar.classList.add("colourbar");
                colourbar.style.background = "var(--colour)";
                NewNotice.style = `--colour: ${colour}`;
                // Appends the colour bar to the new notice
                NewNotice.append(colourbar);
                // Appends the new notice into the notice container
                NoticeContainer.append(NewNotice);
              }
            });
          }
        }
      }
    };
    // Data sent as the POST request
    xhr2.send(JSON.stringify({ date: TodayFormatted }));

    // Sends similar HTTP Post Request for the notices
    chrome.storage.local.get(null, function (result) {
      if (result.notificationcollector) {
        var xhr3 = new XMLHttpRequest();
        xhr3.open("POST", `${location.origin}/seqta/student/heartbeat?`, true);
        xhr3.setRequestHeader(
          "Content-Type",
          "application/json; charset=utf-8",
        );
        xhr3.onreadystatechange = function () {
          if (xhr3.readyState === 4) {
            var Notifications = JSON.parse(xhr3.response);
            var alertdiv = document.getElementsByClassName(
              "notifications__bubble___1EkSQ",
            )[0];
            if (typeof alertdiv == "undefined") {
              console.log("[BetterSEQTA] No notifications currently");
            } else {
              alertdiv.textContent = Notifications.payload.notifications.length;
            }
          }
        };
        xhr3.send(
          JSON.stringify({
            timestamp: "1970-01-01 00:00:00.0",
            hash: "#?page=/home",
          }),
        );
      }
    });
    console.log("Getting assessments");
    let activeClassList;
    GetUpcomingAssessments().then((assessments) => {
      GetActiveClasses().then((classes) => {
        // Gets all subjects for the student
        for (let i = 0; i < classes.length; i++) {
          const element = classes[i];
          // eslint-disable-next-line
          if (element.hasOwnProperty("active")) { // for some reason eslint gets mad, even though it works?
            // Finds the active class list with the current subjects
            activeClassList = classes[i];
          }
        }
        let activeSubjects = activeClassList.subjects;

        let activeSubjectCodes = [];
        // Gets the code for each of the subjects and puts them in an array
        let element;
        for (let i = 0; i < activeSubjects.length; i++) {
          element = activeSubjects[i];
          activeSubjectCodes.push(element.code);
        }

        let CurrentAssessments = [];
        for (let i = 0; i < assessments.length; i++) {
          element = assessments[i];
          if (activeSubjectCodes.includes(element.code)) {
            CurrentAssessments.push(element);
          }
        }

        CurrentAssessments.sort(comparedate);
        console.log(CurrentAssessments, activeSubjects);

        CreateUpcomingSection(CurrentAssessments, activeSubjects);

        // Run function to check if gap between assessments > 7 days?
      });
    });
  }, 8);
}

function SendNewsPage() {
  setTimeout(function () {
    // Sends the html data for the home page
    console.log("[BetterSEQTA] Started Loading News Page");
    document.title = "News ― SEQTA Learn";
    var element = document.querySelector("[data-key=news]");

    // Apply the active class to indicate clicked on home button
    element.classList.add("active");

    // Remove all current elements in the main div to add new elements
    var main = document.getElementById("main");
    main.innerHTML = "";

    // Creates the root of the home page added to the main div
    var htmlStr = "<div class=\"home-root\"><div class=\"home-container\" id=\"news-container\"><h1 class=\"border\">Latest Headlines - ABC News</h1></div></div>";

    var html = stringToHTML(htmlStr);
    // Appends the html file to main div
    // Note : firstChild of html is done due to needing to grab the body from the stringToHTML function
    main.append(html.firstChild);

    const titlediv = document.getElementById("title").firstChild;
    titlediv.innerText = "News";
    AppendLoadingSymbol("newsloading", "#news-container");

    chrome.runtime.sendMessage({ type: "sendNews" }, function (response) {
      let newsarticles = response.news.articles;
      var newscontainer = document.querySelector("#news-container");
      document.getElementById("newsloading").remove();
      for (let i = 0; i < newsarticles.length; i++) {
        let newsarticle = document.createElement("a");
        newsarticle.classList.add("NewsArticle");
        newsarticle.href = newsarticles[i].url;
        newsarticle.target = "_blank";

        let articleimage = document.createElement("div");
        articleimage.classList.add("articleimage");

        if (newsarticles[i].urlToImage == "null") {
          articleimage.style.backgroundImage = `url(${chrome.runtime.getURL(
            "icons/betterseqta-light-outline.png",
          )})`;
          articleimage.style.width = "20%";
          articleimage.style.margin = "0 7.5%";
        } else {
          articleimage.style.backgroundImage = `url(${newsarticles[i].urlToImage})`;
        }

        let articletext = document.createElement("div");
        articletext.classList.add("ArticleText");
        let title = document.createElement("a");
        title.innerText = newsarticles[i].title;
        title.href = newsarticles[i].url;
        title.target = "_blank";

        let description = document.createElement("p");
        description.innerHTML = newsarticles[i].description;

        articletext.append(title);
        articletext.append(description);

        newsarticle.append(articleimage);
        newsarticle.append(articletext);
        newscontainer.append(newsarticle);
      }
    });
  }, 8);
}

/*
function EnabledDisabledToBool(input) {
  if (input == "enabled") {
    return true;
  }
  if (input == "disabled") {
    return false;
  }
}
*/

function LoadInit() {
  console.log("[BetterSEQTA] Started Init");
  chrome.storage.local.get(null, function (result) {
    if (result.onoff) {
      SendHomePage();
    }
  });
}
