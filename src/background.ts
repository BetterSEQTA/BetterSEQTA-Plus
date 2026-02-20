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

browser.runtime.onMessage.addListener(
  // @ts-ignore - OnMessageListener expects literal true for async, we return boolean
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

      case "fetchThemes": {
        const { token } = request;
        const apiUrl = `https://betterseqta.org/api/themes?type=betterseqta&limit=100&nocache=${Date.now()}`;
        const githubUrl = `https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes.json?nocache=${Date.now()}`;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        fetch(apiUrl, { cache: "no-store", headers })
          .then((r) => r.json())
          .then(sendResponse)
          .catch((err) => {
            console.warn("[Background] fetchThemes API failed, trying GitHub fallback:", err?.message);
            fetch(githubUrl, { cache: "no-store" })
              .then((r) => r.json())
              .then((data) => sendResponse({ success: true, data: { themes: data.themes ?? [] } }))
              .catch((fallbackErr) => {
                console.error("[Background] fetchThemes GitHub fallback error:", fallbackErr);
                sendResponse({ success: false, error: fallbackErr?.message });
              });
          });
        return true;
      }

      case "fetchFromUrl": {
        const { url } = request;
        if (!url || typeof url !== "string") {
          sendResponse({ error: "Missing url" });
          return false;
        }
        fetch(url, { cache: "no-store" })
          .then((r) => r.json())
          .then((data) => sendResponse({ data }))
          .catch((err) => {
            console.error("[Background] fetchFromUrl error:", err);
            sendResponse({ error: err?.message });
          });
        return true;
      }

      case "cloudReserveClient": {
        const redirect_uri =
          request.redirect_uri ?? "https://accounts.betterseqta.org/auth/bsplus/callback";
        fetch("https://accounts.betterseqta.org/api/bsplus/client/reserve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ redirect_uri }),
        })
          .then(async (r) => {
            const text = await r.text();
            let data: any = {};
            try {
              data = text ? JSON.parse(text) : {};
            } catch {
              sendResponse({ error: "Invalid response from server" });
              return;
            }
            if (!r.ok) {
              sendResponse({
                error: data?.error ?? `Reserve failed (${r.status})`,
              });
            } else {
              sendResponse(data);
            }
          })
          .catch((err) => {
            console.error("[Background] cloudReserveClient error:", err);
            sendResponse({ error: err?.message ?? "Network error" });
          });
        return true;
      }

      case "cloudLogin": {
        const { client_id, redirect_uri, login, password } = request;
        if (!client_id || !redirect_uri || !login || !password) {
          sendResponse({
            error: "Missing client_id, redirect_uri, login, or password",
          });
          return false;
        }
        fetch("https://accounts.betterseqta.org/api/bsplus/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id,
            redirect_uri,
            login,
            password,
          }),
        })
          .then(async (r) => {
            const text = await r.text();
            let data: any = {};
            try {
              data = text ? JSON.parse(text) : {};
            } catch {
              sendResponse({ error: "Invalid response from server" });
              return;
            }
            if (!r.ok) {
              sendResponse({ error: data?.error ?? "Login failed" });
              return;
            }
            sendResponse(data);
          })
          .catch((err) => {
            console.error("[Background] cloudLogin error:", err);
            sendResponse({ error: err?.message ?? "Network error" });
          });
        return true;
      }

      case "cloudRefresh": {
        const { refresh_token, client_id } = request;
        if (!refresh_token || !client_id) {
          sendResponse({ error: "Missing refresh_token or client_id" });
          return false;
        }
        fetch("https://accounts.betterseqta.org/api/bsplus/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token, client_id }),
        })
          .then(async (r) => {
            const text = await r.text();
            let data: any = {};
            try {
              data = text ? JSON.parse(text) : {};
            } catch {
              sendResponse({ error: "Invalid response from server" });
              return;
            }
            if (!r.ok) sendResponse({ error: data?.error ?? "Refresh failed" });
            else sendResponse(data);
          })
          .catch((err) => {
            console.error("[Background] cloudRefresh error:", err);
            sendResponse({ error: err?.message ?? "Network error" });
          });
        return true;
      }

      case "cloudFavorite": {
        const { themeId, token, action } = request;
        if (!themeId || !token) {
          sendResponse({ success: false, error: "Theme ID and token required" });
          return false;
        }
        const isFavorite = action === "favorite";
        const url = `https://betterseqta.org/api/themes/${themeId}/favorite`;
        fetch(url, {
          method: isFavorite ? "POST" : "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then(sendResponse)
          .catch((err) => {
            console.error("[Background] cloudFavorite error:", err);
            sendResponse({ success: false, error: err?.message });
          });
        return true;
      }

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
    assessmentsAverage: false,
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
