import browser from "webextension-polyfill";
import type { SettingsState } from "@/types/storage";
import { fetchNews } from "./background/news";

function reloadSeqtaPages() {
  const result = browser.tabs.query({});
  function open(tabs: any) {
    for (let tab of tabs) {
      if (tab.title.includes("SEQTA Learn")) {
        browser.tabs.reload(tab.id);
      }
    }
  }
  result.then(open, console.error);
}

// @ts-ignore
browser.runtime.onMessage.addListener(
  (request: any, _: any, sendResponse: (response?: any) => void) => {
    switch (request.type) {
      case "reloadTabs":
        reloadSeqtaPages();
        break;

      case "extensionPages":
        browser.tabs.query({}).then(function (tabs) {
          for (let tab of tabs) {
            if (tab.url?.includes("chrome-extension://")) {
              browser.tabs.sendMessage(tab.id!, request);
            }
          }
        });
        break;

      case "currentTab":
        browser.tabs
          .query({ active: true, currentWindow: true })
          .then(function (tabs) {
            browser.tabs
              .sendMessage(tabs[0].id!, request)
              .then(function (response) {
                sendResponse(response);
              });
          });
        return true;

      case "githubTab":
        browser.tabs.create({ url: "github.com/BetterSEQTA/BetterSEQTA-Plus" });
        break;

      case "setDefaultStorage":
        SetStorageValue(getDefaultValues());
        break;

      case "sendNews":
        fetchNews(request.source ?? "australia", sendResponse);
        return true;

      default:
        console.log("Unknown request type");
    }

    return false;
  },
);

function detectLowEndDevice(): boolean {
  // Check for low-end hardware indicators
  const lowCoreCount = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
  const lowMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory <= 2;
  
  return lowCoreCount || lowMemory;
}

function getDefaultValues(): SettingsState {
  const isLowEndDevice = detectLowEndDevice();

  return {
    onoff: true,
    animatedbk: true,
    bksliderinput: "50",
    transparencyEffects: false,
    lessonalert: true,
    defaultmenuorder: [],
    menuitems: {
      assessments: { toggle: true },
      courses: { toggle: true },
      dashboard: { toggle: true },
      documents: { toggle: true },
      forums: { toggle: true },
      goals: { toggle: true },
      home: { toggle: true },
      messages: { toggle: true },
      myed: { toggle: true },
      news: { toggle: true },
      notices: { toggle: true },
      portals: { toggle: true },
      reports: { toggle: true },
      settings: { toggle: true },
      timetable: { toggle: true },
      welcome: { toggle: true },
    },
    menuorder: [],
    subjectfilters: {},
    selectedTheme: "",
    selectedColor:
      "linear-gradient(40deg, rgba(201,61,0,1) 0%, RGBA(170, 5, 58, 1) 100%)",
    originalSelectedColor: "",
    DarkMode: true,
    animations: !isLowEndDevice,
    assessmentsAverage: true,
    defaultPage: "home",
    shortcuts: [
      {
        name: "Outlook",
        enabled: true,
      },
      {
        name: "Office",
        enabled: true,
      },
      {
        name: "Google",
        enabled: true,
      },
    ],
    customshortcuts: [],
    lettergrade: false,
    newsSource: "australia",
  };
}

function SetStorageValue(object: any) {
  for (var i in object) {
    browser.storage.local.set({ [i]: object[i] });
  }
}

browser.runtime.onInstalled.addListener(function (event) {
  browser.storage.local.remove(["justupdated"]);
  browser.storage.local.remove(["data"]);

  if (event.reason == "install" || event.reason == "update") {
    browser.storage.local.set({ justupdated: true });
  }
});
