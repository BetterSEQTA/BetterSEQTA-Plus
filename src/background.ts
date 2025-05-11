import browser from "webextension-polyfill"; // WebExtension API polyfill
import type { SettingsState } from "@/types/storage"; // Type definition for settings state
import { fetchNews } from "./background/news"; // Function to fetch news data

function reloadSeqtaPages() {
  const result = browser.tabs.query({}); // Query all open tabs
  function open(tabs: any) {
    for (let tab of tabs) {
      if (tab.title.includes("SEQTA Learn")) {
        browser.tabs.reload(tab.id); // Reload any tab with title including "SEQTA Learn"
      }
    }
  }
  result.then(open, console.error); // Handle tab query result
}

// @ts-ignore
browser.runtime.onMessage.addListener(
  (request: any, _: any, sendResponse: (response?: any) => void) => {
    switch (request.type) {
      case "reloadTabs":
        reloadSeqtaPages(); // Reload SEQTA tabs
        break;

      case "extensionPages":
        browser.tabs.query({}).then(function (tabs) {
          for (let tab of tabs) {
            if (tab.url?.includes("chrome-extension://")) {
              browser.tabs.sendMessage(tab.id!, request); // Send message to extension pages
            }
          }
        });
        break;

      case "currentTab":
        browser.tabs
          .query({ active: true, currentWindow: true }) // Get current active tab
          .then(function (tabs) {
            browser.tabs
              .sendMessage(tabs[0].id!, request) // Send message to the current tab
              .then(function (response) {
                sendResponse(response); // Respond with received message
              });
          });
        return true; // Indicate asynchronous response

      case "githubTab":
        browser.tabs.create({ url: "github.com/BetterSEQTA/BetterSEQTA-Plus" }); // Open GitHub page
        break;

      case "setDefaultStorage":
        SetStorageValue(DefaultValues); // Set default storage values
        break;

      case "sendNews":
        fetchNews(request.source ?? "australia", sendResponse); // Fetch news and respond
        return true; // Indicate asynchronous response

      default:
        console.log("Unknown request type"); // Log unrecognized request types
    }

    return false; // Default return for synchronous responses
  },
);

// Default settings values
const DefaultValues: SettingsState = {
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
  animations: true,
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

// Set multiple values in local storage
function SetStorageValue(object: any) {
  for (var i in object) {
    browser.storage.local.set({ [i]: object[i] }); // Store each setting individually
  }
}

// Convert background slider input to speed value for animation
function convertBksliderToSpeed(bksliderinput: number): number {
  const minBase = 50;
  const maxBase = 150;

  const scaledValue =
    2 + ((maxBase - bksliderinput) / (maxBase - minBase)) ** 4;
  const baseSpeed = 3;

  const speed = baseSpeed / scaledValue;
  return speed;
}

// Migrate legacy settings to plugin-based structure
async function migrateLegacySettings() {
  const storage = (await browser.storage.local.get(
    null,
  )) as unknown as SettingsState;

  // Animated Background Migration
  if ("animatedbk" in storage || "bksliderinput" in storage) {
    const animatedSettings = {
      enabled: storage.animatedbk ?? true,
      speed: storage.bksliderinput
        ? convertBksliderToSpeed(parseFloat(storage.bksliderinput))
        : 1,
    };
    await browser.storage.local.set({
      "plugin.animated-background.settings": animatedSettings,
    });
  }

  // Assessments Average Migration
  if ("assessmentsAverage" in storage || "lettergrade" in storage) {
    const assessmentsSettings = {
      enabled: storage.assessmentsAverage ?? true,
      lettergrade: storage.lettergrade ?? false,
    };
    await browser.storage.local.set({
      "plugin.assessments-average.settings": assessmentsSettings,
    });
  }

  if ("selectedTheme" in storage) {
    const themesSettings = { enabled: true };
    await browser.storage.local.set({
      "plugin.themes.settings": themesSettings,
    });
  }
  if (storage.notificationCollector !== false) {
    await browser.storage.local.set({
      "plugin.notificationCollector.settings": { enabled: true },
    });
  } else {
    await browser.storage.local.set({
      "plugin.notificationCollector.settings": { enabled: false },
    });
  }

  const keysToRemove = [
    "animatedbk",
    "bksliderinput",
    "assessmentsAverage",
    "lettergrade",
  ];
  await browser.storage.local.remove(keysToRemove); // Remove legacy keys after migration
}

// Run on extension install or update
browser.runtime.onInstalled.addListener(function (event) {
  browser.storage.local.remove(["justupdated"]); // Clear justupdated flag
  browser.storage.local.remove(["data"]); // Remove old data

  if (event.reason == "install" || event.reason == "update") {
    browser.storage.local.set({ justupdated: true }); // Mark as just updated
    migrateLegacySettings(); // Migrate old settings
  }
});
