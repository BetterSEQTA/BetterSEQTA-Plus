import browser from "webextension-polyfill";
import type { SettingsState } from "@/types/storage";
import { fetchNews } from "./background/news";
import {
  initCloudSettingsAutoSync,
  performCloudSettingsDownloadWithRetry,
  performCloudSettingsUploadWithRetry,
  runCloudSettingsPoll,
} from "./background/cloudSettingsAutoSync";

function reloadSeqtaPages() {
  const result = browser.tabs.query({});
  function open(tabs: any) {
    for (let tab of tabs) {
      if (
        tab.title?.includes("SEQTA Learn") ||
        tab.title?.includes("SEQTA Engage")
      ) {
        browser.tabs.reload(tab.id);
      }
    }
  }
  result.then(open, console.error);
}

/** Callback for sending a response back to the message sender */
type MessageSender = { (response?: unknown): void };

function handleFetchThemes(request: any, sendResponse: MessageSender): boolean {
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

function handleFetchThemeDetails(request: any, sendResponse: MessageSender): boolean {
  const { themeId, token } = request;
  if (!themeId || typeof themeId !== "string") {
    sendResponse({ success: false, error: "Missing themeId" });
    return false;
  }
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  fetch(`https://betterseqta.org/api/themes/${themeId}`, { cache: "no-store", headers })
    .then((r) => r.json())
    .then(sendResponse)
    .catch((err) => {
      console.error("[Background] fetchThemeDetails error:", err);
      sendResponse({ success: false, error: err?.message });
    });
  return true;
}

function handleFetchFromUrl(request: any, sendResponse: MessageSender): boolean {
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

async function parseJsonResponse(r: Response): Promise<any> {
  const text = await r.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function handleCloudReserveClient(request: any, sendResponse: MessageSender): boolean {
  const redirect_uri = request.redirect_uri ?? "https://accounts.betterseqta.org/auth/bsplus/callback";
  fetch("https://accounts.betterseqta.org/api/bsplus/client/reserve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redirect_uri }),
  })
    .then(async (r) => {
      const data = await parseJsonResponse(r);
      if (!r.ok) sendResponse({ error: data?.error ?? `Reserve failed (${r.status})` });
      else sendResponse(data);
    })
    .catch((err) => {
      console.error("[Background] cloudReserveClient error:", err);
      sendResponse({ error: err?.message ?? "Network error" });
    });
  return true;
}

function handleCloudLogin(request: any, sendResponse: MessageSender): boolean {
  const { client_id, redirect_uri, login, password } = request;
  if (!client_id || !redirect_uri || !login || !password) {
    sendResponse({ error: "Missing client_id, redirect_uri, login, or password" });
    return false;
  }
  fetch("https://accounts.betterseqta.org/api/bsplus/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id, redirect_uri, login, password }),
  })
    .then(async (r) => {
      const data = await parseJsonResponse(r);
      if (!r.ok) sendResponse({ error: data?.error ?? "Login failed" });
      else sendResponse(data);
    })
    .catch((err) => {
      console.error("[Background] cloudLogin error:", err);
      sendResponse({ error: err?.message ?? "Network error" });
    });
  return true;
}

function handleCloudRefresh(request: any, sendResponse: MessageSender): boolean {
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
      const data = await parseJsonResponse(r);
      if (!r.ok) sendResponse({ error: data?.error ?? "Refresh failed" });
      else sendResponse(data);
    })
    .catch((err) => {
      console.error("[Background] cloudRefresh error:", err);
      sendResponse({ error: err?.message ?? "Network error" });
    });
  return true;
}

function handleCloudSettingsUpload(request: any, sendResponse: MessageSender): boolean {
  void (async () => {
    try {
      const token = request.token as string | undefined;
      if (!token) {
        sendResponse({ success: false, error: "Not authenticated" });
        return;
      }
      const res = await performCloudSettingsUploadWithRetry(token);
      sendResponse({
        success: res.success,
        error: res.error,
        updated_at: res.updated_at,
      });
    } catch (err) {
      console.error("[Background] cloudSettingsUpload error:", err);
      sendResponse({
        success: false,
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  })();
  return true;
}

function handleCloudSettingsDownload(request: any, sendResponse: MessageSender): boolean {
  void (async () => {
    try {
      const token = request.token as string | undefined;
      if (!token) {
        sendResponse({ success: false, error: "Not authenticated" });
        return;
      }
      const res = await performCloudSettingsDownloadWithRetry(token);
      sendResponse({
        success: res.success,
        notFound: res.notFound,
        error: res.error,
        updated_at: res.updated_at,
      });
    } catch (err) {
      console.error("[Background] cloudSettingsDownload error:", err);
      sendResponse({
        success: false,
        error: err instanceof Error ? err.message : "Download failed",
      });
    }
  })();
  return true;
}

function handleCloudFavorite(request: any, sendResponse: MessageSender): boolean {
  const { themeId, token, action } = request;
  if (!themeId || !token) {
    sendResponse({ success: false, error: "Theme ID and token required" });
    return false;
  }
  const isFavorite = action === "favorite";
  fetch(`https://betterseqta.org/api/themes/${themeId}/favorite`, {
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

/** Handler for a message type; receives request, sendResponse, and optional sender (for tab routing) */
type MessageHandler = {
  (request: any, sendResponse: MessageSender, sender?: browser.Runtime.MessageSender): boolean | void;
};

function isSeqtaOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.hostname.includes("seqta") || u.hostname.endsWith(".edu.au");
  } catch {
    return false;
  }
}

const MESSAGE_HANDLERS: Record<string, MessageHandler> = {
  reloadTabs: () => reloadSeqtaPages(),
  extensionPages: (req) => {
    browser.tabs.query({}).then((tabs) => {
      for (const tab of tabs) {
        if (tab.url?.includes("chrome-extension://")) browser.tabs.sendMessage(tab.id!, req);
      }
    });
  },
  currentTab: (req, sendResponse) => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      browser.tabs.sendMessage(tabs[0].id!, req).then(sendResponse);
    });
    return true;
  },
  githubTab: () => {
    void browser.tabs.create({ url: "github.com/BetterSEQTA/BetterSEQTA-Plus" });
  },
  setDefaultStorage: () => SetStorageValue(getDefaultValues()),
  sendNews: (req, sendResponse) => {
    fetchNews(req.source ?? "australia", sendResponse);
    return true;
  },
  fetchThemes: handleFetchThemes,
  fetchThemeDetails: handleFetchThemeDetails,
  fetchFromUrl: handleFetchFromUrl,
  cloudReserveClient: handleCloudReserveClient,
  cloudLogin: handleCloudLogin,
  cloudRefresh: handleCloudRefresh,
  cloudFavorite: handleCloudFavorite,
  cloudSettingsUpload: handleCloudSettingsUpload,
  cloudSettingsDownload: handleCloudSettingsDownload,
  cloudSettingsPoll: () => {
    void runCloudSettingsPoll();
    return false;
  },
  getSeqtaSession: (req: { baseUrl?: string }, sendResponse: MessageSender, sender?: browser.Runtime.MessageSender) => {
    (async () => {
      try {
        let tabId = sender?.tab?.id;
        let originForCheck: string | undefined = req.baseUrl;

        if (tabId == null) {
          const tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
          const tab = tabs[0];
          if (!tab?.id || !tab.url) {
            sendResponse({ appLink: null });
            return;
          }
          tabId = tab.id;
          if (!originForCheck) originForCheck = new URL(tab.url).origin;
        } else if (!originForCheck && sender?.tab?.url) {
          originForCheck = new URL(sender.tab.url).origin;
        }

        if (!originForCheck || !isSeqtaOrigin(originForCheck)) {
          sendResponse({ appLink: null });
          return;
        }

        const reply = (await browser.tabs.sendMessage(tabId, { type: "fetchSeqtaAppLink" })) as
          | { appLink?: string | null }
          | undefined;
        const appLink = typeof reply?.appLink === "string" && reply.appLink.length > 0 ? reply.appLink : null;
        sendResponse({ appLink });
      } catch (err) {
        console.error("[Background] getSeqtaSession error:", err);
        sendResponse({ appLink: null });
      }
    })();
    return true;
  },
};

browser.runtime.onMessage.addListener(
  // @ts-ignore - OnMessageListener expects literal true for async, we return boolean
  (request: any, sender: browser.Runtime.MessageSender, sendResponse: MessageSender) => {
    const handler = MESSAGE_HANDLERS[request.type];
    if (handler) {
      const result = handler(request, sendResponse, sender);
      return result === true;
    }
    console.log("Unknown request type");
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
    iconOnlySidebar: false,
    adaptiveThemeColour: false,
    adaptiveThemeGradient: false,
    adaptiveThemeColourTransition: true,
    autoCloudSettingsSync: true,
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

initCloudSettingsAutoSync({ reloadSeqtaPages });
