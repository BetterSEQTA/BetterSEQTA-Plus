/* global chrome */
import { animate, spring, stagger } from 'motion';
import Color from 'color';

import ShortcutLinks from './seqta/content/links.json';
import MenuitemSVGKey from './seqta/content/MenuItemSVGKey.json';
import stringToHTML from './seqta/utils/stringToHTML.js';
import loading, { AppendLoadingSymbol } from './seqta/ui/Loading.js';

// Icons
import assessmentsicon from './seqta/icons/assessmentsIcon.js';
import coursesicon from './seqta/icons/coursesIcon.js';
import StorageListener from './seqta/utils/StorageListener.js';
import { MessageHandler } from './seqta/utils/MessageListener.js';
import { updateBgDurations } from './seqta/ui/Animation.js';
import { updateAllColors } from './seqta/ui/colors/Manager.js';
import { appendBackgroundToUI } from './seqta/ui/ImageBackgrounds.js';
import { enableCurrentTheme } from './seqta/ui/Themes.js';

export let isChrome = window.chrome;
let SettingsClicked = false;
export let MenuOptionsOpen = false;
let UserInitalCode = '';
let currentSelectedDate = new Date();
let LessonInterval;
export let DarkMode;

var MenuItemMutation = false;
var NonSEQTAPage = false;
var IsSEQTAPage = false;

document.addEventListener(
  'load',
  function () {
    CheckForMenuList();
    if (
      document.childNodes[1].textContent?.includes(
        'Copyright (c) SEQTA Software',
      ) &&
      document.title.includes('SEQTA Learn') &&
      !IsSEQTAPage
    ) {
      IsSEQTAPage = true;
      console.log('[BetterSEQTA+] Verified SEQTA Page');

      let link = document.createElement('link');
      link.href = chrome.runtime.getURL('inject/documentload.css');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      document.getElementsByTagName('html')[0].appendChild(link);

      enableCurrentTheme();
      chrome.storage.local.get(null, function (items) {
        main(items);
      });
    }
    if (
      !document.childNodes[1].textContent?.includes('SEQTA') &&
      !NonSEQTAPage
    ) {
      NonSEQTAPage = true;
    }
  },
  true,
);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function SetDisplayNone(ElementName) {
  return `li[data-key=${ElementName}]{display:var(--menuHidden) !important; transition: 1s;}`;
}

function animbkEnable(item) {
  if (item.animatedbk) {
    CreateBackground();
  } else {
    RemoveBackground();
    document.getElementById('container').style.background = 'var(--background-secondary)';
  }
}

export function ApplyCSSToHiddenMenuItems() {
  var stylesheetInnerText = '';
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
    let MenuItemStyle = document.createElement('style');
    MenuItemStyle.innerText = stylesheetInnerText;
    document.head.appendChild(MenuItemStyle);
  });
}

function OpenWhatsNewPopup() {
  const background = document.createElement('div');
  background.id = 'whatsnewbk';
  background.classList.add('whatsnewBackground');

  const container = document.createElement('div');
  container.classList.add('whatsnewContainer');

  var header = stringToHTML(`<div class="whatsnewHeader">
  <h1>What's New</h1>
  <p>BetterSEQTA+ V${chrome.runtime.getManifest().version}</p>
  </div>`).firstChild;

  let imagecont = document.createElement('div');
  imagecont.classList.add('whatsnewImgContainer');
  let video = document.createElement('video');
  let source = document.createElement('source');
  source.setAttribute('src', chrome.runtime.getURL('resources/update-video.mp4'));
  source.setAttribute('type', 'video/mp4');
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.appendChild(source);
  video.classList.add('whatsnewImg');
  imagecont.appendChild(video);

  let textcontainer = document.createElement('div');
  textcontainer.classList.add('whatsnewTextContainer');

  let textheader = stringToHTML(
    '<h1 class="whatsnewTextHeader">DESIGN OVERHAUL</h1>',
  ).firstChild;
  textcontainer.append(textheader);

  let text = stringToHTML(
    String.raw`
  <div class="whatsnewTextContainer" style="height: 50%;overflow-y: scroll;">
    <li>Themes coming soon!</li>
    
    <h1>3.1.5</h1>
    <li>Minor bug fixes</li>
    <h1>3.1.4</h1>
    <li>Minor bug fixes</li>
    <h1>3.1.3 - Custom Backgrounds</h1>
    <li>Added custom backgrounds with support for images and videos</li>
    <li>Overhauled topbar</li>
    <li>New animated hamburger icon</li>
    <li>Minor bug fixes</li>

    <h1>3.1.2 - New settings menu!</h1>
    <li>Overhauled the settings menu</li>
    <li>Added custom gradients</li>
    <li>Added HEAPS of animations</li>
    <li>Fixed a bug where shortcuts don't show up</li>
    <li>Other minor bugs fixed</li>
    
    <h1>3.1.1 - Minor Bug fixes</h1>
    <li>Fixed assessments overlapping</li>
    <li>Fixed houses not displaying if they aren't a specific color</li>
    <li>Fixed Chrome Webstore Link</li>
    
    <h1>3.1.0 - Design Improvements</h1>
    <li>Minor UI improvements</li>
    <li>Added Animation Speed Slider</li>
    <li>Animation now enables and disables without reloading SEQTA</li>
    <li>Changed logo</li>

    <h1>3.0.0 - BetterSEQTA+ *Complete Overhaul*</h1>
    <li>Redesigned appearance</li>
    <li>Upgraded to manifest V3 (longer support)</li>
    <li>Fixed transitional glitches</li>
    <li>Under the hood improvements</li>
    <li>Fixed News Feed</li>

    <h1>2.0.7 - Added support to other domains + Minor bug fixes</h1>
    <li>Fixed BetterSEQTA+ not loading on some pages</li>
    <li>Fixed text colour of notices being unreadable</li>
    <li>Fixed pages not reloading when saving changes</li>
    
    <h1>2.0.2 - Minor bug fixes</h1>
    <li>Fixed indicator for current lesson</li>
    <li>Fixed text colour for DM messages list in Light mode</li>
    <li>Fixed user info text colour</li>

    <h1>Sleek New Layout</h1>
    <li>Updated with a new font and presentation, BetterSEQTA+ has never looked better.</li>
    
    <h1>New Updated Sidebar</h1>
    <li>Condensed appearance with new updated icons.</li>
    
    <h1>Independent Light Mode and Dark Mode</h1>
    <li>Dark mode and Light mode are now available to pick alongside your chosen Theme Colour. Your Theme Colour will now become an accent colour for the page.
    Light/Dark mode can be toggled with the new button, found in the top-right of the menu bar.</li>

    <h1>Create Custom Shortcuts</h1>
    <li>Found in the BetterSEQTA+ Settings menu, custom shortcuts can now be created with a name and URL of your choice.</li>
  </div>
  `,
  ).firstChild;

  let footer = stringToHTML(
    String.raw`
    <div class="whatsnewFooter">
      <div>
      Report bugs and feedback: 
        <a href="https://github.com/SethBurkart123/EvenBetterSEQTA" target="_blank" style="background: none !important; margin: 0 5px; padding:0;">
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="25px" height="25px" viewBox="0 0 256 250" version="1.1" preserveAspectRatio="xMidYMid">
            <g><path d="M128.00106,0 C57.3172926,0 0,57.3066942 0,128.00106 C0,184.555281 36.6761997,232.535542 87.534937,249.460899 C93.9320223,250.645779 96.280588,246.684165 96.280588,243.303333 C96.280588,240.251045 96.1618878,230.167899 96.106777,219.472176 C60.4967585,227.215235 52.9826207,204.369712 52.9826207,204.369712 C47.1599584,189.574598 38.770408,185.640538 38.770408,185.640538 C27.1568785,177.696113 39.6458206,177.859325 39.6458206,177.859325 C52.4993419,178.762293 59.267365,191.04987 59.267365,191.04987 C70.6837675,210.618423 89.2115753,204.961093 96.5158685,201.690482 C97.6647155,193.417512 100.981959,187.77078 104.642583,184.574357 C76.211799,181.33766 46.324819,170.362144 46.324819,121.315702 C46.324819,107.340889 51.3250588,95.9223682 59.5132437,86.9583937 C58.1842268,83.7344152 53.8029229,70.715562 60.7532354,53.0843636 C60.7532354,53.0843636 71.5019501,49.6441813 95.9626412,66.2049595 C106.172967,63.368876 117.123047,61.9465949 128.00106,61.8978432 C138.879073,61.9465949 149.837632,63.368876 160.067033,66.2049595 C184.49805,49.6441813 195.231926,53.0843636 195.231926,53.0843636 C202.199197,70.715562 197.815773,83.7344152 196.486756,86.9583937 C204.694018,95.9223682 209.660343,107.340889 209.660343,121.315702 C209.660343,170.478725 179.716133,181.303747 151.213281,184.472614 C155.80443,188.444828 159.895342,196.234518 159.895342,208.176593 C159.895342,225.303317 159.746968,239.087361 159.746968,243.303333 C159.746968,246.709601 162.05102,250.70089 168.53925,249.443941 C219.370432,232.499507 256,184.536204 256,128.00106 C256,57.3066942 198.691187,0 128.00106,0 Z M47.9405593,182.340212 C47.6586465,182.976105 46.6581745,183.166873 45.7467277,182.730227 C44.8183235,182.312656 44.2968914,181.445722 44.5978808,180.80771 C44.8734344,180.152739 45.876026,179.97045 46.8023103,180.409216 C47.7328342,180.826786 48.2627451,181.702199 47.9405593,182.340212 Z M54.2367892,187.958254 C53.6263318,188.524199 52.4329723,188.261363 51.6232682,187.366874 C50.7860088,186.474504 50.6291553,185.281144 51.2480912,184.70672 C51.8776254,184.140775 53.0349512,184.405731 53.8743302,185.298101 C54.7115892,186.201069 54.8748019,187.38595 54.2367892,187.958254 Z M58.5562413,195.146347 C57.7719732,195.691096 56.4895886,195.180261 55.6968417,194.042013 C54.9125733,192.903764 54.9125733,191.538713 55.713799,190.991845 C56.5086651,190.444977 57.7719732,190.936735 58.5753181,192.066505 C59.3574669,193.22383 59.3574669,194.58888 58.5562413,195.146347 Z M65.8613592,203.471174 C65.1597571,204.244846 63.6654083,204.03712 62.5716717,202.981538 C61.4524999,201.94927 61.1409122,200.484596 61.8446341,199.710926 C62.5547146,198.935137 64.0575422,199.15346 65.1597571,200.200564 C66.2704506,201.230712 66.6095936,202.705984 65.8613592,203.471174 Z M75.3025151,206.281542 C74.9930474,207.284134 73.553809,207.739857 72.1039724,207.313809 C70.6562556,206.875043 69.7087748,205.700761 70.0012857,204.687571 C70.302275,203.678621 71.7478721,203.20382 73.2083069,203.659543 C74.6539041,204.09619 75.6035048,205.261994 75.3025151,206.281542 Z M86.046947,207.473627 C86.0829806,208.529209 84.8535871,209.404622 83.3316829,209.4237 C81.8013,209.457614 80.563428,208.603398 80.5464708,207.564772 C80.5464708,206.498591 81.7483088,205.631657 83.2786917,205.606221 C84.8005962,205.576546 86.046947,206.424403 86.046947,207.473627 Z M96.6021471,207.069023 C96.7844366,208.099171 95.7267341,209.156872 94.215428,209.438785 C92.7295577,209.710099 91.3539086,209.074206 91.1652603,208.052538 C90.9808515,206.996955 92.0576306,205.939253 93.5413813,205.66582 C95.054807,205.402984 96.4092596,206.021919 96.6021471,207.069023 Z" fill="currentColor" /></g>
          </svg>
        </a>
        <a href="https://chrome.google.com/webstore/detail/betterseqta%2B/afdgaoaclhkhemfkkkonemoapeinchel" target="_blank" style="background: none !important; margin: 0 5px; padding:0;">
          <svg style="width:25px;height:25px" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12,20L15.46,14H15.45C15.79,13.4 16,12.73 16,12C16,10.8 15.46,9.73 14.62,9H19.41C19.79,9.93 20,10.94 20,12A8,8 0 0,1 12,20M4,12C4,10.54 4.39,9.18 5.07,8L8.54,14H8.55C9.24,15.19 10.5,16 12,16C12.45,16 12.88,15.91 13.29,15.77L10.89,19.91C7,19.37 4,16.04 4,12M15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9A3,3 0 0,1 15,12M12,4C14.96,4 17.54,5.61 18.92,8H12C10.06,8 8.45,9.38 8.08,11.21L5.7,7.08C7.16,5.21 9.44,4 12,4M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        </a>
      </div>
    </div>
  `).firstChild;

  let exitbutton = document.createElement('div');
  exitbutton.id = 'whatsnewclosebutton';

  container.append(header);
  container.append(imagecont);
  container.append(textcontainer);
  container.append(text);
  container.append(footer);
  container.append(exitbutton);

  background.append(container);

  document.getElementById('container').append(background);

  let bkelement = document.getElementById('whatsnewbk');
  let popup = document.getElementsByClassName('whatsnewContainer')[0];

  animate(
    [popup, bkelement],
    { scale: [0, 1], opacity: [0, 1] },
    { easing: spring({ stiffness: 220, damping: 18 }) }
  );

  animate(
    '.whatsnewTextContainer *',
    { opacity: [0, 1], y: [10, 0] },
    {
      delay: stagger(0.05, { start: 0.1 }),
      duration: 0.5,
      easing: [.22, .03, .26, 1]  
    }
  );

  chrome.storage.local.remove(['justupdated']);

  bkelement.addEventListener('click', function (event) {
    // Check if the click event originated from the element itself and not any of its children
    if (event.target === bkelement) {
      DeleteWhatsNew();
    }
  });  

  var closeelement = document.getElementById('whatsnewclosebutton');
  closeelement.addEventListener('click', function () {
    DeleteWhatsNew();
  });
}

async function finishLoad() {
  try {
    var loadingbk = document.getElementById('loading');
    loadingbk.style.opacity = '0';
    await delay(501);
    loadingbk.remove();
  } catch (err) {
    console.log(err);
  }

  chrome.storage.local.get(['justupdated'], function (result) {
    if (result.justupdated) {
      OpenWhatsNewPopup();
    }
  });
}

async function DeleteWhatsNew() {
  const bkelement = document.getElementById('whatsnewbk');
  const popup = document.getElementsByClassName('whatsnewContainer')[0];
  
  animate(
    [popup, bkelement],
    { opacity: [1, 0]},
    { easing: [.22, .03, .26, 1] }
  ).finished.then(() => {
    bkelement.remove();
  });
}

export function CreateBackground() {
  // Creating and inserting 3 divs containing the background applied to the pages
  var bklocation = document.getElementById('container');
  var menu = document.getElementById('menu');
  var bk = document.createElement('div');
  bk.classList.add('bg');

  bklocation.insertBefore(bk, menu);

  var bk2 = document.createElement('div');
  bk2.classList.add('bg');
  bk2.classList.add('bg2');
  bklocation.insertBefore(bk2, menu);

  var bk3 = document.createElement('div');
  bk3.classList.add('bg');
  bk3.classList.add('bg3');
  bklocation.insertBefore(bk3, menu);
}

export function RemoveBackground() {
  var bk = document.getElementsByClassName('bg');
  var bk2 = document.getElementsByClassName('bg2');
  var bk3 = document.getElementsByClassName('bg3');

  if (bk.length == 0 || bk2.length == 0 || bk3.length == 0) return;

  bk[0].remove();
  bk2[0].remove();
  bk3[0].remove();
}

export function waitForElm(selector) {
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
    typeof element.contentDocument.documentElement.childNodes[1] == 'undefined'
  ) {
    await delay(1000);
    RunColourCheck(element);
  } else {
    element.contentDocument.documentElement.childNodes[1].style.color = 'white';
  }
}

export function GetiFrameCSSElement() {
  var cssFile = chrome.runtime.getURL('inject/iframe.css');
  var fileref = document.createElement('link');
  fileref.setAttribute('rel', 'stylesheet');
  fileref.setAttribute('type', 'text/css');
  fileref.setAttribute('href', cssFile);

  return fileref;
}

function CheckiFrameItems() {
  // Injecting CSS File to the webpage to overwrite iFrame default CSS
  let fileref = GetiFrameCSSElement();

  const observer = new MutationObserver(function (mutations_list) {
    mutations_list.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (added_node) {
        if (added_node.tagName == 'IFRAME') {
          chrome.storage.local.get(['DarkMode'], function (result) {
            DarkMode = result.DarkMode;
            if (DarkMode) {
              RunColourCheck(added_node);
              if (
                added_node.contentDocument.documentElement.childNodes[1].style
                  .color != 'white'
              ) {
                added_node.contentDocument.documentElement.childNodes[1].style.color =
                  'white';
              }
              if (
                !added_node.contentDocument.documentElement.firstChild.innerHTML.includes(
                  'iframe.css',
                )
              ) {
                added_node.contentDocument.documentElement.firstChild.appendChild(
                  fileref,
                );
              }
              added_node.addEventListener('load', function () {
                if (
                  added_node.contentDocument.documentElement.childNodes[1].style
                    .color != 'white'
                ) {
                  added_node.contentDocument.documentElement.childNodes[1].style.color =
                    'white';
                }
                if (
                  !added_node.contentDocument.documentElement.firstChild.innerHTML.includes(
                    'iframe.css',
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
  let filterbutton = document.createElement('div');
  filterbutton.classList.add('messages-filterbutton');
  filterbutton.innerText = 'Filter';

  let header = document.getElementsByClassName(
    'MessageList__MessageList___3DxoC',
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

async function LoadPageElements() {
  await AddBetterSEQTAElements(true);
  var sublink = window.location.href.split('/')[4];
  switch (sublink) {
  case 'news':
    console.log('[BetterSEQTA+] Started Init');
    chrome.storage.local.get(null, function (result) {
      if (result.onoff) {
        SendNewsPage();

        // Sends similar HTTP Post Request for the notices
        chrome.storage.local.get(null, function (result) {
          if (result.notificationcollector) {
            enableNotificationCollector();
          }
        });
        finishLoad();
      }
    });
    break;

  case 'home':
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
        enableNotificationCollector();
      }
    });
    break;
  }

  const observer = new MutationObserver(function (mutations_list) {
    mutations_list.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (added_node) {
        if (added_node.classList.contains('messages')) {
          let element = document.getElementById('title').firstChild;
          element.innerText = 'Direct Messages';
          document.title = 'Direct Messages ― SEQTA Learn';
          SortMessagePageItems(added_node);

          waitForElm('[data-message]').then(() => {
            animate(
              '[data-message]',
              { opacity: [0, 1], y: [10, 0] },
              {
                delay: stagger(0.05),
                duration: 0.5,
                easing: [.22, .03, .26, 1]  
              }
            );
          });
        } else if (added_node.classList.contains('notices')) {
          CheckNoticeTextColour(added_node);
        } else if (added_node.classList.contains('dashboard')) {
          let ranOnce = false;
          waitForElm('.dashlet').then(() => {
            if (ranOnce) return;
            ranOnce = true;
            animate(
              '.dashboard *:not(.dashlet-timetable), .dashboard .message *',
              { opacity: [0, 1], y: [10, 0] },
              {
                delay: stagger(0.01),
                duration: 0.5,
                easing: [.22, .03, .26, 1]  
              }
            );
          });
        } else if (added_node.classList.contains('documents')) {
          let ranOnce = false;
          waitForElm('.document').then(() => {
            if (ranOnce) return;
            ranOnce = true;
            animate(
              '.documents tbody tr.document',
              { opacity: [0, 1], y: [10, 0] },
              {
                delay: stagger(0.05),
                duration: 0.5,
                easing: [.22, .03, .26, 1]  
              }
            );
          });
        } else if (added_node.classList.contains('reports')) {
          let ranOnce = false;
          waitForElm('.report').then(() => {
            if (ranOnce) return;
            ranOnce = true;
            animate(
              '.reports .item',
              { opacity: [0, 1], y: [10, 0] },
              {
                delay: stagger(0.05, { start: 0.2 }),
                duration: 0.5,
                easing: [.22, .03, .26, 1]  
              }
            );
          });
        }
      });
    });
  });

  observer.observe(document.querySelector('#main'), {
    subtree: false,
    childList: true,
  });
}

function CheckNoticeTextColour(notice) {
  const observer = new MutationObserver(function (mutations_list) {
    mutations_list.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (added_node) {
        chrome.storage.local.get(['DarkMode'], function (result) {
          DarkMode = result.DarkMode;
          if (added_node.classList.contains('notice')) {
            var hex = added_node.style.cssText.split(' ')[1];
            var threshold = GetThresholdOfColor(hex);
            if (DarkMode && threshold < 100) {
              added_node.style.cssText = '--color: undefined;';
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

export function tryLoad() {
  waitForElm('.login').then(() => {
    finishLoad();
  });

  waitForElm('.day-container').then(() => {
    finishLoad();
  });

  waitForElm('[data-key=welcome]').then((elm) => {
    elm.classList.remove('active');
  });

  waitForElm('.code').then((elm) => {
    if (!elm.innerText.includes('BetterSEQTA')) LoadPageElements();
  });

  // Waits for page to call on load, run scripts
  document.addEventListener(
    'load',
    function () {
      CheckiFrameItems();
    },
    true,
  );
}

function ChangeMenuItemPositions(storage) {
  let menuorder = storage;

  var menuList = document.querySelector('#menu').firstChild.childNodes;

  let listorder = [];
  for (let i = 0; i < menuList.length; i++) {

    let a = menuorder.indexOf(menuList[i].dataset.key);

    listorder.push(a);
  }

  var newArr = [];
  for (var i = 0; i < listorder.length; i++) {
    newArr[listorder[i]] = menuList[i];
  }

  let listItemsDOM = document.getElementById('menu').firstChild;
  for (let i = 0; i < newArr.length; i++) {
    const element = newArr[i];
    if (element) {
      element.setAttribute('data-checked', 'true');
      listItemsDOM.appendChild(element);
    }
  }
}

export async function ObserveMenuItemPosition() {
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

      observer.observe(document.querySelector('#menu').firstChild, {
        subtree: true,
        childList: true,
      });
    }
  });
}

function main(storedSetting) {
  const onoff = storedSetting.onoff;
  DarkMode = storedSetting.DarkMode;

  // Handle undefined onoff setting
  if (typeof onoff === 'undefined') {
    chrome.runtime.sendMessage({ type: 'setDefaultStorage' });
  }

  const initialize = () => {
    InjectStyles();
    InjectCustomIcons();
    updateAllColors(storedSetting);
    ApplyCSSToHiddenMenuItems();
    loading();
    CheckLoadOnPeriods();
  };

  const handleDisabled = () => {
    waitForElm('.code').then(AppendElementsToDisabledPage);
  };

  if (onoff) {
    console.log('[BetterSEQTA+] Enabled');
    initialize();

    if (!isChrome || isChrome === 'undefined') {
      tryLoad();
    }

    window.addEventListener('load', tryLoad);
  } else {
    if (!isChrome || isChrome === 'undefined') {
      handleDisabled();
    }
    window.addEventListener('load', handleDisabled);
  }
}

function InjectStyles() {
  var cssFile = chrome.runtime.getURL('inject/injected.css');
  var fileref = document.createElement('link');
  fileref.setAttribute('rel', 'stylesheet');
  fileref.setAttribute('type', 'text/css');
  fileref.setAttribute('href', cssFile);
  document.head.appendChild(fileref);
  document.getElementsByTagName('html')[0].appendChild(fileref);
}

function InjectCustomIcons() {
  const fontURL = chrome.runtime.getURL('fonts/IconFamily.woff');

  const style = document.createElement('style');
  style.setAttribute('type', 'text/css');
  style.innerHTML = `
    @font-face {
      font-family: 'IconFamily';
      src: url('${fontURL}') format('woff');
      font-weight: normal;
      font-style: normal;
    }`;
  document.head.appendChild(style);
}

export function AppendElementsToDisabledPage() {
  AddBetterSEQTAElements(false);

  let settingsStyle = document.createElement('style');
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

new StorageListener();
new MessageHandler();

var PageLoaded = false;
async function CheckLoadOnPeriods() {
  if (!PageLoaded) {
    await delay(1000);
    var code = document.getElementsByClassName('code')[0];
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

export function closeSettings() {
  var extensionsettings = document.getElementById('ExtensionPopup');

  extensionsettings.classList.add('hide');
  SettingsClicked = false;
}

function addExtensionSettings() {
  const link = document.createElement('link');
  link.href = chrome.runtime.getURL('popup/popup.css');
  link.type = 'text/css';
  link.rel = 'stylesheet';
  document.querySelector('html').appendChild(link);

  const extensionPopup = document.createElement('div');
  extensionPopup.classList.add('outside-container', 'hide');
  extensionPopup.id = 'ExtensionPopup';
  document.body.appendChild(extensionPopup);

  const extensionIframe = document.createElement('iframe');
  extensionIframe.src = chrome.runtime.getURL('interface/index.html');
  extensionIframe.id = 'ExtensionIframe';
  extensionIframe.allowTransparency = true;
  extensionIframe.style.width = '384px';
  extensionIframe.style.height = '600px';
  extensionIframe.style.border = 'none';
  extensionIframe.setAttribute('excludeDarkCheck', true);
  extensionPopup.appendChild(extensionIframe);

  const container = document.getElementById('container');
  const closeExtensionPopup = () => {
    if (!SettingsClicked) {
      extensionPopup.classList.add('hide');
      extensionIframe.contentWindow.postMessage('popupClosed', '*');
    }
    SettingsClicked = false;
  };
  container.onclick = (event) => {
    if (event.target.id !== 'AddedSettings') {
      closeExtensionPopup();
    } else {
      SettingsClicked = false;
    }
  };
}

function ApplyDraggableFunctions() {
  var listItens = document.querySelectorAll('.draggable');
  [].forEach.call(listItens, function (item) {
    addEventsDragAndDrop(item);
  });
}

var dragSrcEl;

function dragStart(e) {
  this.style.opacity = '0.4';
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function dragEnter() {
  this.classList.add('over');
}

function dragLeave(e) {
  e.stopPropagation();
  this.classList.remove('over');
}

function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
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
  var listItens = document.querySelectorAll('.draggable');
  [].forEach.call(listItens, function (item) {
    item.classList.remove('over');
  });
  this.style.opacity = '1';
}

function addEventsDragAndDrop(el) {
  el.addEventListener('dragstart', dragStart, false);
  el.addEventListener('dragenter', dragEnter, false);
  el.addEventListener('dragover', dragOver, false);
  el.addEventListener('dragleave', dragLeave, false);
  el.addEventListener('drop', dragDrop, false);
  el.addEventListener('dragend', dragEnd, false);
}

function cloneAttributes(target, source) {
  [...source.attributes].forEach((attr) => {
    target.setAttribute(attr.nodeName, attr.nodeValue);
  });
}

export function OpenMenuOptions() {
  chrome.storage.local.get(null, function (result) {
    var container = document.getElementById('container');
    var menu = document.getElementById('menu');

    if (result.defaultmenuorder.length == '0') {
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

    let cover = document.createElement('div');
    cover.classList.add('notMenuCover');
    menu.style.zIndex = '20';
    menu.style.setProperty('--menuHidden', 'flex');
    container.append(cover);

    let menusettings = document.createElement('div');
    menusettings.classList.add('editmenuoption-container');

    let defaultbutton = document.createElement('div');
    defaultbutton.classList.add('editmenuoption');
    defaultbutton.innerText = 'Restore Default';
    defaultbutton.id = 'restoredefaultoption';

    let savebutton = document.createElement('div');
    savebutton.classList.add('editmenuoption');
    savebutton.innerText = 'Save';
    savebutton.id = 'restoredefaultoption';

    menusettings.appendChild(defaultbutton);
    menusettings.appendChild(savebutton);

    menu.appendChild(menusettings);

    let ListItems = menu.firstChild.childNodes;
    for (let i = 0; i < ListItems.length; i++) {
      const element = ListItems[i];

      element.classList.add('draggable');
      element.setAttribute('draggable', true);
      if (element.classList.contains('hasChildren')) {
        element.classList.remove('active');
        menu.firstChild.classList.remove('noscroll');
      }

      let MenuItemToggle = stringToHTML(
        `<div class="onoffswitch" style="margin: auto 0;"><input class="onoffswitch-checkbox notification menuitem" type="checkbox" id="${element.dataset.key}"><label for="${element.dataset.key}" class="onoffswitch-label"></label>`,
      ).firstChild;
      element.append(MenuItemToggle);

      if (!element.dataset.betterseqta) {
        var a = document.createElement('section');
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

    var menubuttons = document.getElementsByClassName('menuitem');
    chrome.storage.local.get(['menuitems'], function (result) {
      var menuItems = result.menuitems;
      let buttons = document.getElementsByClassName('menuitem');
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
      chrome.storage.local.get(['menuitems'], function () {
        var menuItems = {};
        menubuttons = menu.firstChild.childNodes;
        let button = document.getElementsByClassName('menuitem');
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
        element.parentNode.parentNode.style.display = 'var(--menuHidden)';
      }
      if (element.checked) {
        element.parentNode.parentNode.style.setProperty(
          'display',
          'flex',
          'important',
        );
      }
    }

    for (let i = 0; i < menubuttons.length; i++) {
      const element = menubuttons[i];
      element.addEventListener('change', () => {
        StoreMenuSettings();
        changeDisplayProperty(element);
      });
    }

    function closeAll() {
      ListItems = menu.firstChild.childNodes;
      menusettings.remove();
      cover.remove();
      MenuOptionsOpen = false;
      menu.style.setProperty('--menuHidden', 'none');

      for (let i = 0; i < ListItems.length; i++) {
        const element = ListItems[i];
        element.classList.remove('draggable');
        element.setAttribute('draggable', false);

        if (!element.dataset.betterseqta) {
          var a = document.createElement('li');
          a.innerHTML = element.innerHTML;
          cloneAttributes(a, element);
          menu.firstChild.insertBefore(a, element);
          element.remove();
        }
      }

      let switches = menu.querySelectorAll('.onoffswitch');
      for (let i = 0; i < switches.length; i++) {
        switches[i].remove();
      }

      StoreMenuSettings();
    }

    cover.addEventListener('click', closeAll);
    savebutton.addEventListener('click', closeAll);

    defaultbutton.addEventListener('click', function () {
      chrome.storage.local.get(null, function (response) {
        const options = response.defaultmenuorder;
        chrome.storage.local.set({ menuorder: options });
        ChangeMenuItemPositions(options);

        for (let i = 0; i < menubuttons.length; i++) {
          const element = menubuttons[i];
          element.checked = true;
          element.parentNode.parentNode.style.setProperty(
            'display',
            'flex',
            'important',
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

  if (element.dataset.key == 'messages') {
    element.firstChild.innerText = 'Direct Messages';
  }

  let newsvg = stringToHTML(svg).firstChild;
  item.insertBefore(newsvg, item.firstChild);
}

async function AddBetterSEQTAElements(toggle) {
  var code = document.getElementsByClassName('code')[0];
  // Replaces students code with the version of BetterSEQTA
  if (code != null) {
    if (!code.innerHTML.includes('BetterSEQTA')) {
      UserInitalCode = code.innerText;
      code.innerText = `BetterSEQTA v${chrome.runtime.getManifest().version}`;
      code.setAttribute('data-hover', 'Click for user code');
      code.addEventListener('click', function () {
        var code = document.getElementsByClassName('code')[0];
        if (code.innerText.includes('BetterSEQTA')) {
          code.innerText = UserInitalCode;
          code.setAttribute('data-hover', 'Click for BetterSEQTA version');
        } else {
          code.innerText = `BetterSEQTA v${
            chrome.runtime.getManifest().version
          }`;
          code.setAttribute('data-hover', 'Click for user code');
        }
      });
      if (toggle) {
        // Creates Home menu button and appends it as the first child of the list

        const result = chrome.storage.local.get(['animatedbk']);
        const sliderVal = chrome.storage.local.get(['bksliderinput']);

        result.then(animbkEnable);
        sliderVal.then(updateBgDurations);

        // Load darkmode state
        chrome.storage.local.get(['DarkMode'], function (result) {
          DarkMode = result.DarkMode;
        });

        var titlebar = document.createElement('div');
        titlebar.classList.add('titlebar');
        let container = document.getElementById('content');
        container.append(titlebar);
        var NewButtonStr = '<li class="item" data-key="home" id="homebutton" data-path="/home" data-betterseqta="true"><label><svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" /></svg><span>Home</span></label></li>';
        var NewButton = stringToHTML(NewButtonStr);
        var menu = document.getElementById('menu');
        var List = menu.firstChild;
        List.insertBefore(NewButton.firstChild, List.firstChild);

        fetch(`${location.origin}/seqta/student/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({
            mode: 'normal',
            query: null,
            redirect_url: location.origin,
          }),
        })
          .then((result) => result.json())
          .then((response) => {
            let info = response.payload;

            var titlebar = document.getElementsByClassName('titlebar')[0];
            titlebar.append(
              stringToHTML(
                '<div class="userInfosvgdiv tooltip"><svg class="userInfosvg" viewBox="0 0 24 24"><path fill="var(--text-primary)" d="M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z"></path></svg><div class="tooltiptext topmenutooltip" id="logouttooltip"></div></div>',
              ).firstChild,
            );
            var userinfostr = `<div class="userInfo"><div class="userInfoText"><div style="display: flex; align-items: center;"><p class="userInfohouse userInfoCode"></p><p class="userInfoName">${info.userDesc}</p></div><p class="userInfoCode">${UserInitalCode}</p></div></div>`;
            var userinfo = stringToHTML(userinfostr).firstChild;

            titlebar.append(userinfo);

            var logoutbutton = document.getElementsByClassName('logout')[0];
            var userInfosvgdiv = document.getElementById('logouttooltip');
            userInfosvgdiv.appendChild(logoutbutton);

            fetch(`${location.origin}/seqta/student/load/message/people`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
              },
              body: JSON.stringify({ mode: 'student' }),
            })
              .then((result) => result.json())
              .then((response) => {
                let students = response.payload;
                var index = students.findIndex(function (person) {
                  return (
                    person.firstname == info.userDesc.split(' ')[0] &&
                    person.surname == info.userDesc.split(' ')[1]
                  );
                });

                let houseelement =
                  document.getElementsByClassName('userInfohouse')[0];
                if (students[index]?.house) {
                  houseelement.style.background = students[index].house_colour;
                  try {
                    let colorresult = GetThresholdOfColor(
                      students[index]?.house_colour,
                    );

                    if (colorresult && colorresult > 300) {
                      houseelement.style.color = 'black';
                    } else if (colorresult < 300) {
                      houseelement.style.color = 'white';
                    } else {
                      houseelement.style.color = 'black';
                    }
                    houseelement.innerText =
                      students[index].year + students[index].house;
                  } catch (error) {
                    houseelement.innerText = students[index].house;
                  }
                } else {
                  houseelement.innerText = students[index].year;
                }
              });
          });

        var NewsButtonStr = '<li class="item" data-key="news" id="newsbutton" data-path="/news" data-betterseqta="true"><label><svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M20 3H4C2.89 3 2 3.89 2 5V19C2 20.11 2.89 21 4 21H20C21.11 21 22 20.11 22 19V5C22 3.89 21.11 3 20 3M5 7H10V13H5V7M19 17H5V15H19V17M19 13H12V11H19V13M19 9H12V7H19V9Z" /></svg>News</label></li>';
        var NewsButton = stringToHTML(NewsButtonStr);
        List.appendChild(NewsButton.firstChild);

        editmenu = document.createElement('div');
        editmenu.classList.add('editmenu');

        let svg = stringToHTML(
          '<svg style="width:24px;height:24px;padding:5px;" id="editmenu" viewBox="0 0 24 24"><path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" /></svg>',
        );
        editmenu.append(svg.firstChild);

        menu.appendChild(editmenu);

        let a = document.createElement('div');
        a.classList.add('icon-cover');
        a.id = 'icon-cover';
        menu.appendChild(a);

        var editmenu = document.querySelector('#editmenu');
        editmenu.addEventListener('click', function () {
          if (!MenuOptionsOpen) {
            OpenMenuOptions();
          }
        });

        var menuCover = document.querySelector('#icon-cover');
        menuCover.addEventListener('click', function () {
          location.href = '../#?page=/home';
          SendHomePage();
          document
            .getElementById('menu')
            .firstChild.classList.remove('noscroll');
        });
        // Creates the home container when the menu button is pressed
        var homebutton = document.getElementById('homebutton');
        homebutton.addEventListener('click', function () {
          if (!MenuOptionsOpen) {
            SendHomePage();
          }
        });

        // Creates the news container when the menu button is pressed
        var newsbutton = document.getElementById('newsbutton');
        newsbutton.addEventListener('click', function () {
          if (!MenuOptionsOpen) {
            SendNewsPage();
          }
        });
      }

      appendBackgroundToUI();
      addExtensionSettings();

      // If betterSEQTA+ is enabled, run the code
      if (toggle) {
        // Creates settings and dashboard buttons next to alerts
        var SettingsButton = stringToHTML(
          '<button class="addedButton tooltip" id="AddedSettings""><svg width="24" height="24" viewBox="0 0 24 24"><g><g><path d="M23.182,6.923c-.29,0-3.662,2.122-4.142,2.4l-2.8-1.555V4.511l4.257-2.456a.518.518,0,0,0,.233-.408.479.479,0,0,0-.233-.407,6.511,6.511,0,1,0-3.327,12.107,6.582,6.582,0,0,0,6.148-4.374,5.228,5.228,0,0,0,.333-1.542A.461.461,0,0,0,23.182,6.923Z"></path><path d="M9.73,10.418,7.376,12.883c-.01.01-.021.016-.03.025L1.158,19.1a2.682,2.682,0,1,0,3.793,3.793l4.583-4.582,0,0,4.1-4.005-.037-.037A9.094,9.094,0,0,1,9.73,10.418ZM3.053,21.888A.894.894,0,1,1,3.946,21,.893.893,0,0,1,3.053,21.888Z"></path></g></g></svg><div class="tooltiptext topmenutooltip">BetterSEQTA+ Settings</div></button>',
        );
        var ContentDiv = document.getElementById('content');
        ContentDiv.append(SettingsButton.firstChild);

        const result = await new Promise(resolve => {
          chrome.storage.local.get(null, resolve);
        });
        
        const DarkMode = result.DarkMode;
        const tooltipString = GetLightDarkModeString(DarkMode);
        const svgContent = DarkMode ? '<defs><clipPath id="__lottie_element_80"><rect width="24" height="24" x="0" y="0"></rect></clipPath></defs><g clip-path="url(#__lottie_element_80)"><g style="display: block;" transform="matrix(1,0,0,1,12,12)" opacity="1"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill-opacity="1" d=" M0,-4 C-2.2100000381469727,-4 -4,-2.2100000381469727 -4,0 C-4,2.2100000381469727 -2.2100000381469727,4 0,4 C2.2100000381469727,4 4,2.2100000381469727 4,0 C4,-2.2100000381469727 2.2100000381469727,-4 0,-4z"></path></g></g><g style="display: block;" transform="matrix(1,0,0,1,12,12)" opacity="1"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill-opacity="1" d=" M0,6 C-3.309999942779541,6 -6,3.309999942779541 -6,0 C-6,-3.309999942779541 -3.309999942779541,-6 0,-6 C3.309999942779541,-6 6,-3.309999942779541 6,0 C6,3.309999942779541 3.309999942779541,6 0,6z M8,-3.309999942779541 C8,-3.309999942779541 8,-8 8,-8 C8,-8 3.309999942779541,-8 3.309999942779541,-8 C3.309999942779541,-8 0,-11.3100004196167 0,-11.3100004196167 C0,-11.3100004196167 -3.309999942779541,-8 -3.309999942779541,-8 C-3.309999942779541,-8 -8,-8 -8,-8 C-8,-8 -8,-3.309999942779541 -8,-3.309999942779541 C-8,-3.309999942779541 -11.3100004196167,0 -11.3100004196167,0 C-11.3100004196167,0 -8,3.309999942779541 -8,3.309999942779541 C-8,3.309999942779541 -8,8 -8,8 C-8,8 -3.309999942779541,8 -3.309999942779541,8 C-3.309999942779541,8 0,11.3100004196167 0,11.3100004196167 C0,11.3100004196167 3.309999942779541,8 3.309999942779541,8 C3.309999942779541,8 8,8 8,8 C8,8 8,3.309999942779541 8,3.309999942779541 C8,3.309999942779541 11.3100004196167,0 11.3100004196167,0 C11.3100004196167,0 8,-3.309999942779541 8,-3.309999942779541z"></path></g></g></g>' :
          '<defs><clipPath id="__lottie_element_263"><rect width="24" height="24" x="0" y="0"></rect></clipPath></defs><g clip-path="url(#__lottie_element_263)"><g style="display: block;" transform="matrix(1.5,0,0,1.5,7,12)" opacity="1"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill-opacity="1" d=" M0,-4 C-2.2100000381469727,-4 -1.2920000553131104,-2.2100000381469727 -1.2920000553131104,0 C-1.2920000553131104,2.2100000381469727 -2.2100000381469727,4 0,4 C2.2100000381469727,4 4,2.2100000381469727 4,0 C4,-2.2100000381469727 2.2100000381469727,-4 0,-4z"></path></g></g><g style="display: block;" transform="matrix(-1,0,0,-1,12,12)" opacity="1"><g opacity="1" transform="matrix(1,0,0,1,0,0)"><path fill-opacity="1" d=" M0,6 C-3.309999942779541,6 -6,3.309999942779541 -6,0 C-6,-3.309999942779541 -3.309999942779541,-6 0,-6 C3.309999942779541,-6 6,-3.309999942779541 6,0 C6,3.309999942779541 3.309999942779541,6 0,6z M8,-3.309999942779541 C8,-3.309999942779541 8,-8 8,-8 C8,-8 3.309999942779541,-8 3.309999942779541,-8 C3.309999942779541,-8 0,-11.3100004196167 0,-11.3100004196167 C0,-11.3100004196167 -3.309999942779541,-8 -3.309999942779541,-8 C-3.309999942779541,-8 -8,-8 -8,-8 C-8,-8 -8,-3.309999942779541 -8,-3.309999942779541 C-8,-3.309999942779541 -11.3100004196167,0 -11.3100004196167,0 C-11.3100004196167,0 -8,3.309999942779541 -8,3.309999942779541 C-8,3.309999942779541 -8,8 -8,8 C-8,8 -3.309999942779541,8 -3.309999942779541,8 C-3.309999942779541,8 0,11.3100004196167 0,11.3100004196167 C0,11.3100004196167 3.309999942779541,8 3.309999942779541,8 C3.309999942779541,8 8,8 8,8 C8,8 8,3.309999942779541 8,3.309999942779541 C8,3.309999942779541 11.3100004196167,0 11.3100004196167,0 C11.3100004196167,0 8,-3.309999942779541 8,-3.309999942779541z"></path></g></g></g>';
        
        const LightDarkModeButton = stringToHTML(`
          <button class="addedButton DarkLightButton tooltip" id="LightDarkModeButton">
            <svg xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>
            <div class="tooltiptext topmenutooltip" id="darklighttooliptext">${tooltipString}</div>
          </button>
        `);
        
        ContentDiv.append(LightDarkModeButton.firstChild);
        
        updateAllColors(DarkMode, result.selectedColor);

        // Locate the menuToggle element
        const menuToggle = document.getElementById('menuToggle');
        menuToggle.innerHTML = '';

        // Create three divs to act as lines of the hamburger icon
        for (let i = 0; i < 3; i++) {
          const line = document.createElement('div');
          line.className = 'hamburger-line';
          menuToggle.appendChild(line);
        }
        
        document.getElementById('LightDarkModeButton').addEventListener('click', async () => {
          const result = await new Promise(resolve => {
            chrome.storage.local.get(null, resolve);
          });
          
          const newDarkMode = !result.DarkMode;
          chrome.storage.local.set({ DarkMode: newDarkMode });
          
          updateAllColors(newDarkMode, result.selectedColor);
          
          const darklightText = document.getElementById('darklighttooliptext');
          darklightText.innerText = GetLightDarkModeString(newDarkMode);
        });
      } else {
        // Creates settings and dashboard buttons next to alerts
        SettingsButton = stringToHTML(
          '<button class="addedButton" id="AddedSettings""><svg width="24" height="24" viewBox="0 0 24 24"><g style="fill: var(--text-color);"><g><path d="M23.182,6.923c-.29,0-3.662,2.122-4.142,2.4l-2.8-1.555V4.511l4.257-2.456a.518.518,0,0,0,.233-.408.479.479,0,0,0-.233-.407,6.511,6.511,0,1,0-3.327,12.107,6.582,6.582,0,0,0,6.148-4.374,5.228,5.228,0,0,0,.333-1.542A.461.461,0,0,0,23.182,6.923Z"></path><path d="M9.73,10.418,7.376,12.883c-.01.01-.021.016-.03.025L1.158,19.1a2.682,2.682,0,1,0,3.793,3.793l4.583-4.582,0,0,4.1-4.005-.037-.037A9.094,9.094,0,0,1,9.73,10.418ZM3.053,21.888A.894.894,0,1,1,3.946,21,.893.893,0,0,1,3.053,21.888Z"></path></g></g></svg></button>',
        );
        ContentDiv = document.getElementById('content');
        ContentDiv.append(SettingsButton.firstChild);
      }

      var AddedSettings = document.getElementById('AddedSettings');
      var extensionsettings = document.getElementById('ExtensionPopup');
      
      AddedSettings.addEventListener('click', function () {
        extensionsettings.classList.toggle('hide');
        SettingsClicked = true;
      });
    }
  }
}

let tooltipstring;

function GetLightDarkModeString(darkmodetoggle) {
  if (darkmodetoggle) {
    tooltipstring = 'Switch to light theme';
  } else {
    tooltipstring = 'Switch to dark theme';
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
  startDate.setHours(startTime.split(':')[0]);
  startDate.setMinutes(startTime.split(':')[1]);
  startDate.setSeconds('00');

  // Takes end time of current lesson and makes it into a Date function for comparison
  let endDate = new Date(currentDate.getTime());
  endDate.setHours(endTime.split(':')[0]);
  endDate.setMinutes(endTime.split(':')[1]);
  endDate.setSeconds('00');

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
      currentSelectedDate.toLocaleDateString('en-au') ==
      date.toLocaleDateString('en-au')
    ) {
      if (valid) {
        // Apply the activelesson class to increase the box-shadow of current lesson
        elementA.classList.add('activelesson');
      } else {
        // Removes the activelesson class to ensure only the active lesson have the class
        if (elementA != null) {
          elementA.classList.remove('activelesson');
        }
      }
    }
  }

  // If 5 minutes before the start of another lesson:
  if (minutes == 5) {
    chrome.storage.local.get('lessonalert', function (result) {
      if (result.lessonalert) {
        // Checks if notifications are supported
        if (!window.Notification) {
          console.log('Browser does not support notifications.');
        } else {
          // check if permission is already granted
          if (Notification.permission === 'granted') {
            new Notification('Next Lesson in 5 Minutes:', {
              body:
                'Subject: ' +
                lesson.description +
                ' \nRoom: ' +
                lesson.room +
                ' \nTeacher: ' +
                lesson.staff,
            });
          } else {
            // request permission from user
            Notification.requestPermission()
              .then(function (p) {
                if (p === 'granted') {
                  // show notification here
                  new Notification('Next Lesson in 5 Minutes:', {
                    body:
                      'Subject: ' +
                      lesson.description +
                      ' \nRoom: ' +
                      lesson.room +
                      ' \nTeacher: ' +
                      lesson.staff,
                  });
                } else {
                  console.log('User blocked notifications.');
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

export function GetThresholdOfColor(color) {
  // Case-insensitive regular expression for matching RGBA colors
  const rgbaRegex = /rgba?\(([^)]+)\)/gi;

  // Check if the color string is a gradient (linear or radial)
  if (color.includes('gradient')) {
    let gradientThresholds = [];

    // Find and replace all instances of RGBA in the gradient
    let match;
    while ((match = rgbaRegex.exec(color)) !== null) {
      // Extract the individual components (r, g, b, a)
      const rgbaString = match[1];
      const [r, g, b] = rgbaString.split(',').map(str => str.trim());

      // Compute the threshold using your existing algorithm
      const threshold = Math.sqrt(r ** 2 + g ** 2 + b ** 2);

      // Store the computed threshold
      gradientThresholds.push(threshold);
    }

    // Calculate the average threshold
    const averageThreshold = gradientThresholds.reduce((acc, val) => acc + val, 0) / gradientThresholds.length;
    
    return averageThreshold;

  } else {
    // Handle the color as a simple RGBA (or hex, or whatever the Color library supports)
    const rgb = Color.rgb(color).object();
    return Math.sqrt(rgb.r ** 2 + rgb.g ** 2 + rgb.b ** 2);
  }
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

// Helper function to build the assessment URL
function buildAssessmentURL(programmeID, metaID, itemID = '') {
  const base = '../#?page=/assessments/';
  return itemID ? `${base}${programmeID}:${metaID}&item=${itemID}` : `${base}${programmeID}:${metaID}`;
}

// Function to create a lesson div element from a lesson object
function makeLessonDiv(lesson, num) {
  if (!lesson) throw new Error('No lesson provided.');

  const { code, colour, description, staff, room, from, until, attendanceTitle, programmeID, metaID, assessments } = lesson;

  // Construct the base lesson string with default values using ternary operators
  let lessonString = `
    <div class="day" id="${code + num}" style="${colour}">
      <h2>${description || 'Unknown'}</h2>
      <h3>${staff || 'Unknown'}</h3>
      <h3>${room || 'Unknown'}</h3>
      <h4>${from || 'Unknown'} - ${until || 'Unknown'}</h4>
      <h5>${attendanceTitle || 'Unknown'}</h5>
  `;

  // Add buttons for assessments and courses if applicable
  if (programmeID !== 0) {
    lessonString += `
      <div class="day-button clickable" style="right: 5px;" onclick="console.log('clicked'); document.querySelector('#menu ul').classList.add('noscroll'); location.href='${buildAssessmentURL(programmeID, metaID)}'">${assessmentsicon}</div>
      <div class="day-button clickable" style="right: 35px;" onclick="location.href='../#?page=/courses/${programmeID}:${metaID}'">${coursesicon}</div>
    `;
  }

  // Add assessments if they exist
  if (assessments && assessments.length > 0) {
    const assessmentString = assessments.map(element =>
      `<p onclick="console.log('clicked'); document.querySelector('#menu ul').classList.add('noscroll'); location.href = '${buildAssessmentURL(programmeID, metaID, element.id)}';">${element.title}</p>`
    ).join('');

    lessonString += `
      <div class="tooltip assessmenttooltip">
        <svg style="width:28px;height:28px;border-radius:0;" viewBox="0 0 24 24">
          <path fill="#ed3939" d="M16 2H4C2.9 2 2 2.9 2 4V20C2 21.11 2.9 22 4 22H16C17.11 22 18 21.11 18 20V4C18 2.9 17.11 2 16 2M16 20H4V4H6V12L8.5 9.75L11 12V4H16V20M20 15H22V17H20V15M22 7V13H20V7H22Z" />
        </svg>
        <div class="tooltiptext">${assessmentString}</div>
      </div>
    `;
  }

  lessonString += '</div>';

  return stringToHTML(lessonString);
}

function CheckUnmarkedAttendance(lessonattendance) {
  if (lessonattendance) {
    var lesson = lessonattendance.label;
  } else {
    lesson = ' ';
  }
  return lesson;
}

function callHomeTimetable(date, change) {
  // Creates a HTTP Post Request to the SEQTA page for the students timetable
  var xhr = new XMLHttpRequest();
  xhr.open('POST', `${location.origin}/seqta/student/load/timetable?`, true);
  // Sets the response type to json
  xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');

  xhr.onreadystatechange = function () {
    // Once the response is ready
    if (xhr.readyState === 4) {
      var serverResponse = JSON.parse(xhr.response);
      let lessonArray = [];
      var DayContainer = document.getElementById('day-container');
      // If items in response:
      if (serverResponse.payload.items.length > 0) {
        if (!DayContainer.innerText || change) {
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
                lessonArray[i].colour = '--item-colour: #8e8e8e;';
              } else {
                lessonArray[i].colour = `--item-colour: ${subject.value};`;
                let result = GetThresholdOfColor(subject.value);

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
            DayContainer.innerText = '';
            for (let i = 0; i < lessonArray.length; i++) {
              var div = makeLessonDiv(lessonArray[i], i + 1);
              // Append each of the lessons into the day-container
              if (lessonArray[i].invert) {
                div.firstChild.classList.add('day-inverted');
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
          DayContainer.innerText = '';
          var dummyDay = document.createElement('div');
          dummyDay.classList.add('day-empty');
          let img = document.createElement('img');
          img.src = chrome.runtime.getURL('icons/betterseqta-light-icon.png');
          let text = document.createElement('p');
          text.innerText = 'No lessons available.';
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
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ student: 69 }),
  });

  return func
    .then((result) => result.json())
    .then((response) => response.payload);
}

function GetActiveClasses() {
  let func = fetch(`${location.origin}/seqta/student/load/subjects?`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
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
  var options = { weekday: 'long', month: 'long', day: 'numeric' };
  const FormattedDate = new Date(date);

  const assessments = value.assessments;
  const container = value.div;

  let DateTitleDiv = document.createElement('div');
  DateTitleDiv.classList.add('upcoming-date-title');

  if (datecase) {
    let datetitle = document.createElement('h5');
    datetitle.classList.add('upcoming-special-day');
    datetitle.innerText = datecase;
    DateTitleDiv.append(datetitle);
    container.setAttribute('data-day', datecase);
  }

  let DateTitle = document.createElement('h5');
  DateTitle.innerText = FormattedDate.toLocaleDateString('en-AU', options);
  DateTitleDiv.append(DateTitle);

  container.append(DateTitleDiv);

  let assessmentContainer = document.createElement('div');
  assessmentContainer.classList.add('upcoming-date-assessments');

  for (let i = 0; i < assessments.length; i++) {
    const element = assessments[i];
    let item = document.createElement('div');
    item.classList.add('upcoming-assessment');
    item.setAttribute('data-subject', element.code);
    item.id = `assessment${element.id}`;

    item.style = element.colour;

    let titlediv = document.createElement('div');
    titlediv.classList.add('upcoming-subject-title');

    let titlesvg =
      stringToHTML(`<svg viewBox="0 0 24 24" style="width:35px;height:35px;fill:white;">
    <path d="M6 20H13V22H6C4.89 22 4 21.11 4 20V4C4 2.9 4.89 2 6 2H18C19.11 2 20 2.9 20 4V12.54L18.5 11.72L18 12V4H13V12L10.5 9.75L8 12V4H6V20M24 17L18.5 14L13 17L18.5 20L24 17M15 19.09V21.09L18.5 23L22 21.09V19.09L18.5 21L15 19.09Z"></path>
    </svg>`).firstChild;
    titlediv.append(titlesvg);

    let detailsdiv = document.createElement('div');
    detailsdiv.classList.add('upcoming-details');
    let detailstitle = document.createElement('h5');
    detailstitle.innerText = `${element.subject} assessment`;
    let subject = document.createElement('p');
    subject.innerText = element.title;
    subject.classList.add('upcoming-assessment-title');
    subject.onclick = function () {
      location.href = `../#?page=/assessments/${element.programmeID}:${element.metaclassID}&item=${element.id}`;
    };
    detailsdiv.append(detailstitle);
    detailsdiv.append(subject);

    item.append(titlediv);
    item.append(detailsdiv);
    assessmentContainer.append(item);

    fetch(`${location.origin}/seqta/student/assessment/submissions/get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
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
          let submittedtext = document.createElement('div');
          submittedtext.classList.add('upcoming-submittedtext');
          submittedtext.innerText = 'Submitted';
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
    return 'Yesterday';
  }
  if (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  ) {
    return 'Today';
  }
  if (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() + 1 === date2.getDate()
  ) {
    return 'Tomorrow';
  }
}

function CreateSubjectFilter(subjectcode, itemcolour, checked) {
  let label = CreateElement('label', 'upcoming-checkbox-container');
  label.innerText = subjectcode;
  let input = CreateElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.id = `filter-${subjectcode}`;
  label.style = itemcolour;
  let span = CreateElement('span', 'upcoming-checkmark');
  label.append(input);
  label.append(span);

  input.addEventListener('change', function (change) {
    chrome.storage.local.get(null, function (storage) {
      let filters = storage.subjectfilters;
      let id = change.target.id.split('-')[1];
      filters[id] = change.target.checked;

      chrome.storage.local.set({ subjectfilters: filters });
    });
  });

  return label;
}

function CreateFilters(subjects) {
  chrome.storage.local.get(null, function (result) {
    let filteroptions = result.subjectfilters;

    let filterdiv = document.querySelector('#upcoming-filters');
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
  let upcomingitemcontainer = document.querySelector('#upcoming-items');
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
        assessments[i].colour = '--item-colour: #8e8e8e;';
      } else {
        assessments[i].colour = `--item-colour: ${subject.value};`;
        GetThresholdOfColor(subject.value); // result (originally) result = GetThresholdOfColor
      }
    }

    let activeSubjects = []; // TODO: IDK what is going on here, but it didn't exist
    for (let i = 0; i < activeSubjects.length; i++) {
      const element = activeSubjects[i];
      let subjectname = `timetable.subject.colour.${element.code}`;
      let colour = colours.find((element) => element.name === subjectname);
      if (!colour) {
        element.colour = '--item-colour: #8e8e8e;';
      } else {
        element.colour = `--item-colour: ${colour.value};`;
        let result = GetThresholdOfColor(colour.value);
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

      if (specialcase === 'Yesterday') {
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
  let textcontainer = CreateElement('div', 'upcoming-blank');
  let textblank = CreateElement('p', 'upcoming-hiddenassessment');
  let s = '';
  if (numberofassessments > 1) {
    s = 's';
  }
  textblank.innerText = `${numberofassessments} hidden assessment${s} due`;
  textcontainer.append(textblank);
  textcontainer.setAttribute('data-hidden', true);

  parent.append(textcontainer);
}

function FilterUpcomingAssessments(subjectoptions) {
  for (var item in subjectoptions) {
    let subjectdivs = document.querySelectorAll(`[data-subject="${item}"]`);

    for (let i = 0; i < subjectdivs.length; i++) {
      const element = subjectdivs[i];

      if (!subjectoptions[item]) {
        element.classList.add('hidden');
      }
      if (subjectoptions[item]) {
        element.classList.remove('hidden');
      }
      element.parentNode.classList.remove('hidden');

      let children = element.parentNode.parentNode.children;
      for (let i = 0; i < children.length; i++) {
        const element = children[i];
        if (element.hasAttribute('data-hidden')) {
          element.remove();
        }
      }

      if (
        element.parentNode.children.length ==
        element.parentNode.querySelectorAll('.hidden').length
      ) {
        if (element.parentNode.querySelectorAll('.hidden').length > 0) {
          if (!element.parentNode.parentNode.hasAttribute('data-day')) {
            element.parentNode.parentNode.classList.add('hidden');
          } else {
            AddPlaceHolderToParent(
              element.parentNode.parentNode,
              element.parentNode.querySelectorAll('.hidden').length,
            );
          }
        }
      } else {
        element.parentNode.parentNode.classList.remove('hidden');
      }
    }
  }
}

chrome.storage.onChanged.addListener(function (changes) {
  if (changes.subjectfilters) {
    FilterUpcomingAssessments(changes.subjectfilters.newValue);
  }
});

async function GetLessonColours() {
  let func = fetch(`${location.origin}/seqta/student/load/prefs?`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ request: 'userPrefs', asArray: true, user: 69 }),
  });
  return func
    .then((result) => result.json())
    .then((response) => response.payload);
}

export function CreateCustomShortcutDiv(element) {
  // Creates the stucture and element information for each seperate shortcut
  var shortcut = document.createElement('a');
  shortcut.setAttribute('href', element.url);
  shortcut.setAttribute('target', '_blank');
  var shortcutdiv = document.createElement('div');
  shortcutdiv.classList.add('shortcut');
  shortcutdiv.classList.add('customshortcut');

  let image = stringToHTML(
    `
    <svg style="width:39px;height:39px" viewBox="0 0 40 40" class="shortcuticondiv">
      <text 
        text-anchor="middle" 
        x="50%" 
        y="50%" 
        dy=".35em" 
        fill="var(--text-primary)" 
        font-weight="bold" 
        font-size="32" 
        dominant-baseline="middle">
        ${element.icon}
      </text>
    </svg>
    `,
  ).firstChild;
  image.classList.add('shortcuticondiv');
  var text = document.createElement('p');
  text.textContent = element.name;
  shortcutdiv.append(image);
  shortcutdiv.append(text);
  shortcut.append(shortcutdiv);

  document.getElementById('shortcuts').append(shortcut);
}

export function RemoveShortcutDiv(elements) {
  elements.forEach((element) => {
    const shortcuts = document.querySelectorAll('.shortcut');
    shortcuts.forEach((shortcut) => {
      const anchorElement = shortcut.parentElement; // the <a> element is the parent
      const textElement = shortcut.querySelector('p'); // <p> is a direct child of .shortcut
      const title = textElement ? textElement.textContent : '';

      let shouldRemove = title === element.name;

      // Check href only if element.url exists
      if (element.url) {
        shouldRemove = shouldRemove && (anchorElement.getAttribute('href') === element.url);
      }

      if (shouldRemove) {
        anchorElement.remove();
      }
    });
  });
}

function AddCustomShortcutsToPage() {
  chrome.storage.local.get(['customshortcuts'], function (result) {
    var customshortcuts = Object.values(result)[0];
    if (customshortcuts.length > 0) {
      document.getElementsByClassName('shortcut-container')[0].style.display =
        'block';
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
    console.log('[BetterSEQTA] Started Loading Home Page');
    document.title = 'Home ― SEQTA Learn';
    var element = document.querySelector('[data-key=home]');

    // Apply the active class to indicate clicked on home button
    element.classList.add('active');

    // Remove all current elements in the main div to add new elements
    var main = document.getElementById('main');
    main.innerHTML = '';

    const titlediv = document.getElementById('title').firstChild;
    titlediv.innerText = 'Home';
    document.querySelector('link[rel*="icon"]').href =
      chrome.runtime.getURL('icons/icon-48.png');

    currentSelectedDate = new Date();

    // Creates the root of the home page added to the main div
    var html = stringToHTML('<div class="home-root"><div class="home-container" id="home-container"></div></div>');
    
    // Appends the html file to main div
    // Note : firstChild of html is done due to needing to grab the body from the stringToHTML function
    main.append(html.firstChild);

    // Gets the current date
    const date = new Date();

    // Formats the current date used send a request for timetable and notices later
    var TodayFormatted =
      date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();

    // Replaces actual date with a selected date. Used for testing.
    // TodayFormatted = "2020-08-31";

    // Creates the shortcut container into the home container
    var ShortcutStr = '<div class="shortcut-container border"><div class="shortcuts border" id="shortcuts"></div></div>';
    var Shortcut = stringToHTML(ShortcutStr);
    // Appends the shortcut container into the home container
    document.getElementById('home-container').append(Shortcut.firstChild);

    // Creates the container div for the timetable portion of the home page
    var TimetableStr = '<div class="timetable-container border"><div class="home-subtitle"><h2 id="home-lesson-subtitle">Today\'s Lessons</h2><div class="timetable-arrows"><svg width="24" height="24" viewBox="0 0 24 24" style="transform: scale(-1,1)" id="home-timetable-back"><g style="fill: currentcolor;"><path d="M8.578 16.359l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z"></path></g></svg><svg width="24" height="24" viewBox="0 0 24 24" id="home-timetable-forward"><g style="fill: currentcolor;"><path d="M8.578 16.359l4.594-4.594-4.594-4.594 1.406-1.406 6 6-6 6z"></path></g></svg></div></div><div class="day-container" id="day-container"></div></div>';
    var Timetable = stringToHTML(TimetableStr);
    // Appends the timetable container into the home container
    document.getElementById('home-container').append(Timetable.firstChild);

    var timetablearrowback = document.getElementById('home-timetable-back');
    var timetablearrowforward = document.getElementById(
      'home-timetable-forward',
    );

    function SetTimetableSubtitle() {
      var homelessonsubtitle = document.getElementById('home-lesson-subtitle');
      const date = new Date();
      if (
        date.getYear() == currentSelectedDate.getYear() &&
        date.getMonth() == currentSelectedDate.getMonth()
      ) {
        if (date.getDate() == currentSelectedDate.getDate()) {
          // Change text to Today's Lessons
          homelessonsubtitle.innerText = 'Today\'s Lessons';
        } else if (date.getDate() - 1 == currentSelectedDate.getDate()) {
          // Change text to Yesterday's Lessons
          homelessonsubtitle.innerText = 'Yesterday\'s Lessons';
        } else if (date.getDate() + 1 == currentSelectedDate.getDate()) {
          // Change text to Tomorrow's Lessons
          homelessonsubtitle.innerText = 'Tomorrow\'s Lessons';
        } else {
          // Change text to date of the day
          homelessonsubtitle.innerText = `${currentSelectedDate.toLocaleString(
            'en-us',
            { weekday: 'short' },
          )} ${currentSelectedDate.toLocaleDateString('en-au')}`;
        }
      } else {
        // Change text to date of the day
        homelessonsubtitle.innerText = `${currentSelectedDate.toLocaleString(
          'en-us',
          { weekday: 'short' },
        )} ${currentSelectedDate.toLocaleDateString('en-au')}`;
      }
    }

    function changeTimetable(value) {
      currentSelectedDate.setDate(currentSelectedDate.getDate() + value);
      let FormattedDate =
        currentSelectedDate.getFullYear() +
        '-' +
        (currentSelectedDate.getMonth() + 1) +
        '-' +
        currentSelectedDate.getDate();
      callHomeTimetable(FormattedDate, true);
      SetTimetableSubtitle();
    }

    timetablearrowback.addEventListener('click', function () {
      changeTimetable(-1);
    });
    timetablearrowforward.addEventListener('click', function () {
      changeTimetable(1);
    });

    // Adds the shortcuts to the shortcut container
    chrome.storage.local.get(['shortcuts'], function (result) {
      const shortcuts = Object.values(result)[0];
      addShortcuts(shortcuts);
    });

    // Creates the upcoming container and appends to the home container
    var upcomingcontainer = document.createElement('div');
    upcomingcontainer.classList.add('upcoming-container');
    upcomingcontainer.classList.add('border');

    let upcomingtitlediv = CreateElement('div', 'upcoming-title');
    let upcomingtitle = document.createElement('h2');
    upcomingtitle.classList.add('home-subtitle');
    upcomingtitle.innerText = 'Upcoming Assessments';
    upcomingtitlediv.append(upcomingtitle);

    let upcomingfilterdiv = CreateElement(
      'div',
      'upcoming-filters',
      'upcoming-filters',
    );
    upcomingtitlediv.append(upcomingfilterdiv);

    upcomingcontainer.append(upcomingtitlediv);

    let upcomingitems = document.createElement('div');
    upcomingitems.id = 'upcoming-items';
    upcomingitems.classList.add('upcoming-items');

    upcomingcontainer.append(upcomingitems);

    document.getElementById('home-container').append(upcomingcontainer);

    // Creates the notices container into the home container
    var NoticesStr = '<div class="notices-container border"><h2 class="home-subtitle">Notices</h2><div class="notice-container" id="notice-container"></div></div>';
    var Notices = stringToHTML(NoticesStr);
    // Appends the shortcut container into the home container
    document.getElementById('home-container').append(Notices.firstChild);

    animate(
      '.home-container > div',
      { opacity: [0, 1], y: [10, 0] },
      {
        delay: stagger(0.2, { start: 0 }),
        duration: 0.6,
        easing: [.22, .03, .26, 1]  
      }
    );

    callHomeTimetable(TodayFormatted);

    // Sends similar HTTP Post Request for the notices
    var xhr2 = new XMLHttpRequest();
    xhr2.open('POST', `${location.origin}/seqta/student/load/notices?`, true);
    xhr2.setRequestHeader('Content-Type', 'application/json; charset=utf-8');

    xhr2.onreadystatechange = function () {
      if (xhr2.readyState === 4) {
        var NoticesPayload = JSON.parse(xhr2.response);
        var NoticeContainer = document.getElementById('notice-container');
        if (NoticesPayload.payload.length == 0) {
          if (!NoticeContainer.innerText) {
            // If no notices: display no notices
            var dummyNotice = document.createElement('div');
            dummyNotice.textContent = 'No notices for today.';
            dummyNotice.classList.add('dummynotice');
            NoticeContainer.append(dummyNotice);
          }
        } else {
          if (!NoticeContainer.innerText) {
            // For each element in the response json:
            chrome.storage.local.get(['DarkMode'], function (result) {
              DarkMode = result.DarkMode;
              for (let i = 0; i < NoticesPayload.payload.length; i++) {
                // Create a div, and place information from json response
                var NewNotice = document.createElement('div');
                NewNotice.classList.add('notice');
                var title = stringToHTML(
                  '<h3 style="color:var(--colour)">' +
                    NoticesPayload.payload[i].title +
                    '</h3>',
                );
                NewNotice.append(title.firstChild);

                if (NoticesPayload.payload[i].label_title != undefined) {
                  var label = stringToHTML(
                    '<h5 style="color:var(--colour)">' +
                      NoticesPayload.payload[i].label_title +
                      '</h5>',
                  );
                  NewNotice.append(label.firstChild);
                }

                var staff = stringToHTML(
                  '<h6 style="color:var(--colour)">' +
                    NoticesPayload.payload[i].staff +
                    '</h6>',
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
                if (typeof colour == 'string') {
                  let rgb = GetThresholdOfColor(colour);
                  if (rgb < 100 && result.DarkMode) {
                    colour = undefined;
                  }
                }

                var colourbar = document.createElement('div');
                colourbar.classList.add('colourbar');
                colourbar.style.background = 'var(--colour)';
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
        enableNotificationCollector();
      }
    });
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

        CreateUpcomingSection(CurrentAssessments, activeSubjects);
      });
    });
  }, 8);
}

export function addShortcuts(shortcuts) {
  for (let i = 0; i < shortcuts.length; i++) {
    const currentShortcut = shortcuts[i];
    
    if (currentShortcut?.enabled) {
      const Itemname = (currentShortcut?.name ?? '').replace(/\s/g, '');

      const linkDetails = ShortcutLinks?.[Itemname];
      if (linkDetails) {
        createNewShortcut(
          linkDetails.link,
          linkDetails.icon,
          linkDetails.viewBox,
          currentShortcut?.name
        );
      } else {
        console.warn(`No link details found for '${Itemname}'`);
      }
    }
  }
  AddCustomShortcutsToPage();
}

export function enableNotificationCollector() {
  var xhr3 = new XMLHttpRequest();
  xhr3.open('POST', `${location.origin}/seqta/student/heartbeat?`, true);
  xhr3.setRequestHeader(
    'Content-Type',
    'application/json; charset=utf-8'
  );
  xhr3.onreadystatechange = function () {
    if (xhr3.readyState === 4) {
      var Notifications = JSON.parse(xhr3.response);
      var alertdiv = document.getElementsByClassName(
        'notifications__bubble___1EkSQ'
      )[0];
      if (typeof alertdiv == 'undefined') {
        console.log('[BetterSEQTA] No notifications currently');
      } else {
        alertdiv.textContent = Notifications.payload.notifications.length;
      }
    }
  };
  xhr3.send(
    JSON.stringify({
      timestamp: '1970-01-01 00:00:00.0',
      hash: '#?page=/home',
    })
  );
}

export function disableNotificationCollector() {
  var alertdiv = document.getElementsByClassName('notifications__bubble___1EkSQ')[0];
  if (typeof alertdiv != 'undefined') {
    var currentNumber = parseInt(alertdiv.textContent);
    if (currentNumber < 9) {
      alertdiv.textContent = currentNumber;
    } else {
      alertdiv.textContent = '9+';
    }
  }
}

function createNewShortcut(link, icon, viewBox, title) {
  // Creates the stucture and element information for each seperate shortcut
  let shortcut = document.createElement('a');
  shortcut.setAttribute('href', link);
  shortcut.setAttribute('target', '_blank');
  let shortcutdiv = document.createElement('div');
  shortcutdiv.classList.add('shortcut');

  let image = stringToHTML(
    `<svg style="width:39px;height:39px" viewBox="${viewBox}"><path fill="currentColor" d="${icon}" /></svg>`,
  ).firstChild;
  image.classList.add('shortcuticondiv');
  let text = document.createElement('p');
  text.textContent = title;
  shortcutdiv.append(image);
  shortcutdiv.append(text);
  shortcut.append(shortcutdiv);

  document.getElementById('shortcuts').appendChild(shortcut);
}

function SendNewsPage() {
  setTimeout(function () {
    // Sends the html data for the home page
    console.log('[BetterSEQTA] Started Loading News Page');
    document.title = 'News ― SEQTA Learn';
    var element = document.querySelector('[data-key=news]');

    // Apply the active class to indicate clicked on home button
    element.classList.add('active');

    // Remove all current elements in the main div to add new elements
    var main = document.getElementById('main');
    main.innerHTML = '';

    // Creates the root of the home page added to the main div
    var htmlStr = '<div class="home-root"><div class="home-container" id="news-container"><h1 class="border">Latest Headlines - ABC News</h1></div></div>';

    var html = stringToHTML(htmlStr);
    // Appends the html file to main div
    // Note : firstChild of html is done due to needing to grab the body from the stringToHTML function
    main.append(html.firstChild);

    const titlediv = document.getElementById('title').firstChild;
    titlediv.innerText = 'News';
    AppendLoadingSymbol('newsloading', '#news-container');

    chrome.runtime.sendMessage({ type: 'sendNews' }, function (response) {
      let newsarticles = response.news.articles;
      var newscontainer = document.querySelector('#news-container');
      document.getElementById('newsloading').remove();
      for (let i = 0; i < newsarticles.length; i++) {
        let newsarticle = document.createElement('a');
        newsarticle.classList.add('NewsArticle');
        newsarticle.href = newsarticles[i].url;
        newsarticle.target = '_blank';

        let articleimage = document.createElement('div');
        articleimage.classList.add('articleimage');

        if (newsarticles[i].urlToImage == 'null') {
          articleimage.style.backgroundImage = `url(${chrome.runtime.getURL(
            'icons/betterseqta-light-outline.png',
          )})`;
          articleimage.style.width = '20%';
          articleimage.style.margin = '0 7.5%';
        } else {
          articleimage.style.backgroundImage = `url(${newsarticles[i].urlToImage})`;
        }

        let articletext = document.createElement('div');
        articletext.classList.add('ArticleText');
        let title = document.createElement('a');
        title.innerText = newsarticles[i].title;
        title.href = newsarticles[i].url;
        title.target = '_blank';

        let description = document.createElement('p');
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

async function CheckForMenuList() {
  if (!MenuItemMutation) {
    try {
      if (document.getElementById('menu').firstChild) {
        ObserveMenuItemPosition();
        MenuItemMutation = true;
      }
    } catch (error) {
      return;
    }
  }
}

function LoadInit() {
  console.log('[BetterSEQTA] Started Init');
  chrome.storage.local.get(null, function (result) {
    if (result.onoff) {
      SendHomePage();
    }
  });
}
