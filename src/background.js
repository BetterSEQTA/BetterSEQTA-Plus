/*global chrome*/

import { readData, writeData } from "./seqta/utils/IndexedDB.js";

function ReloadSEQTAPages() {
  chrome.tabs.query({}, function (tabs) {
    for (let tab of tabs) {
      if (tab.title.includes("SEQTA Learn")) {
        chrome.tabs.reload(tab.id);
      }
    }
  });
}

// Helper function to handle IndexedDB actions
const handleIndexedDBActions = (request) => {
  return new Promise((resolve, reject) => {
    console.log("request");
    if (request.action === "save") {
      writeData(request.data.type, request.data.data)
        .then(() => {
          resolve({ message: "Data saved successfully" });
        })
        .catch(reject);
    } else if (request.action === "read") {
      readData()
        .then(data => {
          resolve(data);
        })
        .catch(reject);
    } else {
      reject(new Error("Invalid action type"));
    }
  });
};

// Helper function to handle setting permissions
const handleAddPermissions = () => {
  if (typeof chrome.declarativeContent !== "undefined") {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {});
  }
  
  chrome.permissions.request(
    { permissions: ["declarativeContent"], origins: ["*://*/*"] },
    (granted) => {
      if (granted) {
        const rules = [
          // Define your rules here
        ];
        
        rules.forEach(rule => {
          chrome.declarativeContent.onPageChanged.addRules([rule]);
        });
        
        alert("Permissions granted. Reload SEQTA pages to see changes. If this workaround doesn't work, please contact the developer. It will be an easy fix");
      }
    }
  );
};

// Main message listener
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log("Message received in background script", request);

  sendResponse({ type: "success" });
  switch (request.type) {
  case "reloadTabs":
    ReloadSEQTAPages();
    break;
    
  case "IndexedDB":
    handleIndexedDBActions(request, sendResponse);
    return true; // This keeps the message channel open for async sendResponse
    // eslint-disable-next-line no-unreachable
    break;
    
  case "githubTab":
    chrome.tabs.create({ url: "github.com/SethBurkart123/EvenBetterSEQTA" });
    break;
    
  case "setDefaultStorage":
    console.log("Setting default values");
    SetStorageValue(DefaultValues);
    break;
    
  case "addPermissions":
    handleAddPermissions();
    break;

  case "sendNews":
    GetNews(sendResponse);
    return true;
    // eslint-disable-next-line no-unreachable
    break;
    
  default:
    console.log("Unknown request type");
  }
});

function GetNews(sendResponse) {
  // Gets the current date
  const date = new Date();
  // Formats the current date used send a request for timetable and notices later
  const TodayFormatted =
    date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();

  const from =
    date.getFullYear() +
    "-" +
    (date.getMonth() + 1) +
    "-" +
    (date.getDate() - 1);
  console.log(TodayFormatted);
  console.log(from);

  let url = `https://newsapi.org/v2/everything?domains=abc.net.au&from=${from}&apiKey=17c0da766ba347c89d094449504e3080`;

  fetch(url)
    .then((result) => result.json())
    .then((response) => {
      if (response.code == "rateLimited") {
        url += "%00";
        GetNews();
      } else {
        sendResponse({ news: response });
      }
    });
}

const DefaultValues = {
  onoff: true,
  animatedbk: true,
  lessonalert: true,
  notificationcollector: true,
  defaultmenuorder: [],
  menuitems: {},
  menuorder: [],
  subjectfilters: {},
  selectedColor: "#1a1a1a",
  DarkMode: true,
  shortcuts: [
    {
      name: "YouTube",
      enabled: false,
    },
    {
      name: "Outlook",
      enabled: true,
    },
    {
      name: "Office",
      enabled: true,
    },
    {
      name: "Spotify",
      enabled: false,
    },
    {
      name: "Google",
      enabled: true,
    },
    {
      name: "DuckDuckGo",
      enabled: false,
    },
    {
      name: "Cool Math Games",
      enabled: false,
    },
    {
      name: "SACE",
      enabled: false,
    },
    {
      name: "Google Scholar",
      enabled: false,
    },
    {
      name: "Gmail",
      enabled: false,
    },
    {
      name: "Netflix",
      enabled: false,
    },
    {
      name: "educationperfect",
      enabled: true,
    },
  ],
  customshortcuts: [],
};

function SetStorageValue(object) {
  for (var i in object) {
    chrome.storage.local.set({ [i]: object[i] });
  }
}

function UpdateCurrentValues(details) {
  console.log(details);

  chrome.storage.local.get(null, function (items) {
    var CurrentValues = items;

    const NewValue = Object.assign({}, DefaultValues, CurrentValues);

    function CheckInnerElement(element) {
      for (let i in element) {
        if (typeof element[i] === "object") {
          if (typeof DefaultValues[i].length == "undefined") {
            NewValue[i] = Object.assign({}, DefaultValues[i], CurrentValues[i]);
          } else {
            // If the object is an array, turn it back after
            let length = DefaultValues[i].length;
            NewValue[i] = Object.assign({}, DefaultValues[i], CurrentValues[i]);
            let NewArray = [];
            for (let j = 0; j < length; j++) {
              NewArray.push(NewValue[i][j]);
            }
            NewValue[i] = NewArray;
          }
        }
      }
    }
    CheckInnerElement(DefaultValues);

    if (items["customshortcuts"]) {
      NewValue["customshortcuts"] = items["customshortcuts"];
    }

    SetStorageValue(NewValue);
  });
}

function migrateOldStorage() {
  chrome.storage.local.get(null, function (items) {
    let shouldUpdate = false; // Flag to check if there is anything to update
    
    // Check for the old "Name" field and convert it to "name"
    if (items.shortcuts && items.shortcuts.length > 0 && "Name" in items.shortcuts[0]) {
      shouldUpdate = true;
      items.shortcuts = items.shortcuts.map((shortcut) => {
        return {
          name: shortcut.Name,  // Convert "Name" to "name"
          enabled: shortcut.enabled // Keep the "enabled" field as is
        };
      });
    }

    // Check for "educationperfect" and convert it to "Education Perfect"
    if (items.shortcuts && items.shortcuts.length > 0) {
      for (let shortcut of items.shortcuts) {
        if (shortcut.name === "educationperfect") {
          shouldUpdate = true;
          shortcut.name = "Education Perfect"; // Convert to "Education Perfect"
        }
      }
    }

    // If there"s something to update, set the new values in storage
    if (shouldUpdate) {
      chrome.storage.local.set({ shortcuts: items.shortcuts }, function() {
        console.log("Migration completed.");
      });
    }
  });
}

chrome.runtime.onInstalled.addListener(function (event) {
  chrome.storage.local.remove(["justupdated"]);
  UpdateCurrentValues();
  if ( event.reason == "install" ) {
    chrome.storage.local.set({ justupdated: true });
    migrateOldStorage();
  }
});
