import browser from 'webextension-polyfill'
import type { SettingsState } from "@/types/storage";

function reloadSeqtaPages() {
  const result = browser.tabs.query({})
    function open (tabs: any) {
    for (let tab of tabs) {
      if (tab.title.includes('SEQTA Learn')) {
        browser.tabs.reload(tab.id);
      }
    }
  }
  result.then(open, console.error)
}

async function injectPageState(tabId: number) {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ["pageState.js"],
      // @ts-ignore
      world: "MAIN",
    });
    console.info(`[background] Injected pageState.js into tab ${tabId}`);
  } catch (err) {
    console.error(`[background] Failed to inject pageState.js into tab ${tabId}:`, err);
  }
}

// Main message listener
browser.runtime.onMessage.addListener((request: any, sender: any, sendResponse: (response?: any) => void) => {

  switch (request.type) {
    case 'reloadTabs':
      reloadSeqtaPages();
      break;
    
    case 'extensionPages':
      browser.tabs.query({}).then(function (tabs) {
        for (let tab of tabs) {
          if (tab.url?.includes('chrome-extension://')) {
            browser.tabs.sendMessage(tab.id!, request);
          }
        }
      });
      break;
    
    case 'currentTab':
      browser.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
        browser.tabs.sendMessage(tabs[0].id!, request).then(function (response) {
          sendResponse(response);
        });
      });
      return true; // Keep message channel open for async response

    case 'githubTab':
      browser.tabs.create({ url: 'github.com/BetterSEQTA/BetterSEQTA-Plus' });
      break;
      
    case 'setDefaultStorage':
      SetStorageValue(DefaultValues);
      break;

    case 'sendNews':
      const date = new Date();

      const from =
        date.getFullYear() +
        '-' +
        (date.getMonth() + 1) +
        '-' +
        (date.getDate() - 5);

      const url = `https://newsapi.org/v2/everything?domains=abc.net.au&from=${from}&apiKey=17c0da766ba347c89d094449504e3080`;

      GetNews(sendResponse, url);
      return true;
    

      case 'injectMainScript': {
        const senderTab = sender.tab ? sender.tab.id : undefined;

        injectPageState(senderTab!)
        return;
    }
  
    default:
      console.log('Unknown request type');
  }
});

function GetNews(sendResponse: any, url: string) {
  fetch(url)
    .then((result) => result.json())
    .then((response) => {
      if (response.code == 'rateLimited') {
        GetNews(sendResponse, url += '%00');
      } else {
        sendResponse({ news: response });
      }
    });
}

const DefaultValues: SettingsState = {
  onoff: true,
  animatedbk: true,
  bksliderinput: "50",
  transparencyEffects: false,
  lessonalert: true,
  notificationcollector: true,
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
  selectedTheme: '',
  selectedColor: 'linear-gradient(40deg, rgba(201,61,0,1) 0%, RGBA(170, 5, 58, 1) 100%)',
  originalSelectedColor: '',
  DarkMode: true,
  animations: true,
  assessmentsAverage: true,
  defaultPage: 'home',
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
  lettergrade: false,
};

function SetStorageValue(object: any) {
  for (var i in object) {
    browser.storage.local.set({ [i]: object[i] });
  }
}

async function UpdateCurrentValues() {
  try {
    const items = await browser.storage.local.get();
    const CurrentValues = items;

    const NewValue = Object.assign({}, DefaultValues, CurrentValues);

    function CheckInnerElement(element: any) {
      for (let i in element) {
        if (typeof element[i] === 'object') {
          // @ts-expect-error
          if (!Array.isArray(DefaultValues[i])) {
            // @ts-expect-error
            NewValue[i] = Object.assign({}, DefaultValues[i], CurrentValues[i]);
          } else {
            // @ts-expect-error
            const length = DefaultValues[i].length;
            // @ts-expect-error
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
    console.log('[BetterSEQTA+] Values updated successfully');
  } catch (error) {
    console.error('[BetterSEQTA+] Error updating values:', error);
  }
}

browser.runtime.onInstalled.addListener(function (event) {
  browser.storage.local.remove(['justupdated']);
  browser.storage.local.remove(['data']);

  UpdateCurrentValues();
  if ( event.reason == 'install', event.reason == 'update' ) {
    browser.storage.local.set({ justupdated: true });
  }
});
