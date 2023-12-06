
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://54bdb68e80b45182ded22ecf9fe9529c@o4506347383291904.ingest.sentry.io/4506347462393856",

  // Alternatively, use `process.env.npm_package_version` for a dynamic release version
  // if your build tool supports it.
  release: "my-project-name@2.3.12",
  integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,

  // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
import browser from 'webextension-polyfill'
import { onError } from './seqta/utils/onError';
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MyDatabase', 1);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      db.createObjectStore('backgrounds', { keyPath: 'id' });
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event: any) => {
      reject('Error opening database: ' + event.target.errorCode);
    };
  });
};

export const writeData = async (type: any, data: any) => {
  const db: any = await openDB();

  const tx = db.transaction('backgrounds', 'readwrite');
  const store = tx.objectStore('backgrounds');
  const request = await store.put({ id: 'customBackground', type, data });

  return request.result;
};

export const readData = () => {
  return new Promise((resolve, reject) => {
    openDB()
      .then((db: any) => {
        const tx = db.transaction('backgrounds', 'readonly');
        const store = tx.objectStore('backgrounds');

        // Retrieve the custom background
        const getRequest = store.get('customBackground');

        // Attach success and error event handlers
        getRequest.onsuccess = function(event: any) {
          resolve(event.target.result);
        };

        getRequest.onerror = function(event: any) {
          console.error('An error occurred:', event);
          reject(event);
        };
      })
      .catch(error => {
        console.error('An error occurred:', error);
        reject(error);
      });
  });
};

function reloadSeqtaPages() {
  const result = browser.tabs.query({})
    function open (tabs: any) {
    for (let tab of tabs) {
      if (tab.title.includes('SEQTA Learn')) {
        browser.tabs.reload(tab.id);
      }
    }
  }
  result.then(open, onError)
}

// Helper function to handle setting permissions

// Main message listener
browser.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any) => {
  switch (request.type) {
  case 'reloadTabs':
    reloadSeqtaPages();
    break;
  
  case 'currentTab':
    browser.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
      browser.tabs.sendMessage(tabs[0].id!, request).then(function (response) {
        sendResponse(response);
      });
    });
    return true;
  
  case 'githubTab':
    browser.tabs.create({ url: 'github.com/SethBurkart123/EvenBetterSEQTA' });
    break;
    
  case 'setDefaultStorage':
    SetStorageValue(DefaultValues);
    break;

  case 'sendNews':
    GetNews(sendResponse);
    return true;
      
  default:
    console.log('Unknown request type');
  }
});

function GetNews(sendResponse: any) {
  // Gets the current date
  const date = new Date();

  const from =
    date.getFullYear() +
    '-' +
    (date.getMonth() + 1) +
    '-' +
    (date.getDate() - 1);

  let url = `https://newsapi.org/v2/everything?domains=abc.net.au&from=${from}&apiKey=17c0da766ba347c89d094449504e3080`;

  fetch(url)
    .then((result) => result.json())
    .then((response) => {
      if (response.code == 'rateLimited') {
        url += '%00';
        GetNews({});
      } else {
        sendResponse({ news: response });
      }
    });
}

const DefaultValues: any = {
  onoff: true,
  animatedbk: true,
  bksliderinput: 50,
  transparencyEffects: false,
  lessonalert: true,
  notificationcollector: true,
  defaultmenuorder: [],
  menuitems: {},
  menuorder: [],
  subjectfilters: {},
  selectedColor: 'linear-gradient(40deg, rgba(201,61,0,1) 0%, RGBA(170, 5, 58, 1) 100%)',
  DarkMode: true,
  shortcuts: [
    {
      name: 'YouTube',
      enabled: false,
    },
    {
      name: 'Outlook',
      enabled: true,
    },
    {
      name: 'Office',
      enabled: true,
    },
    {
      name: 'Spotify',
      enabled: false,
    },
    {
      name: 'Google',
      enabled: true,
    },
    {
      name: 'DuckDuckGo',
      enabled: false,
    },
    {
      name: 'Cool Math Games',
      enabled: false,
    },
    {
      name: 'SACE',
      enabled: false,
    },
    {
      name: 'Google Scholar',
      enabled: false,
    },
    {
      name: 'Gmail',
      enabled: false,
    },
    {
      name: 'Netflix',
      enabled: false,
    },
    {
      name: 'Education Perfect',
      enabled: false,
    },
  ],
  customshortcuts: [],
};

function SetStorageValue(object: any) {
  for (var i in object) {
    browser.storage.local.set({ [i]: object[i] });
  }
}

function UpdateCurrentValues() {
  const result = browser.storage.local.get()
  function open (items: any) {
    var CurrentValues = items;

    const NewValue = Object.assign({}, DefaultValues, CurrentValues);

    function CheckInnerElement(element: any) {
      for (let i in element) {
        if (typeof element[i] === 'object') {
          if (typeof DefaultValues[i].length == 'undefined') {
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

    if (items['customshortcuts']) {
      NewValue['customshortcuts'] = items['customshortcuts'];
    }

    SetStorageValue(NewValue);
  }
  result.then(open, onError)
}

function migrateOldStorage() {
  const result = browser.storage.local.get()
  function open (items: any) {
    let shouldUpdate = false; // Flag to check if there is anything to update
    
    // Check for the old "Name" field and convert it to "name"
    if (items.shortcuts && items.shortcuts.length > 0 && 'Name' in items.shortcuts[0]) {
      shouldUpdate = true;
      items.shortcuts = items.shortcuts.map((shortcut: any) => {
        return {
          name: shortcut.Name,  // Convert "Name" to "name"
          enabled: shortcut.enabled // Keep the "enabled" field as is
        };
      });
    }

    // Check for "educationperfect" and convert it to "Education Perfect"
    if (items.shortcuts && items.shortcuts.length > 0) {
      for (let shortcut of items.shortcuts) {
        if (shortcut.name === 'educationperfect' || shortcut.name === 'Education Perfect') {
          shouldUpdate = true;
          shortcut.name = 'Education Perfect';
        }
      }
    }

    // If there"s something to update, set the new values in storage
    if (shouldUpdate) {
      const setting = browser.storage.local.set({ shortcuts: items.shortcuts })
      setting.then(() => console.log('Migration Completed.'))
    }
  }
  result.then(open, onError)
}

browser.runtime.onInstalled.addListener(function (event) {
  browser.storage.local.remove(['justupdated']);
  UpdateCurrentValues();
  if ( event.reason == 'install', event.reason == 'update' ) {
    browser.storage.local.set({ justupdated: true });
    migrateOldStorage();
  }
});