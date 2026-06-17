import browser from "webextension-polyfill";
import semver from "semver";
import type { SettingsState } from "@/types/storage";
import { getDefaultSettingsState } from "@/seqta/utils/defaultSettings";
import { ensureSyncableStorageDefaults } from "@/seqta/utils/ensureSyncableStorageDefaults";
import { fetchNews } from "./background/news";
import {
  initCloudSettingsAutoSync,
  performCloudSettingsDownloadWithRetry,
  performCloudSettingsUploadWithRetry,
  requestCloudSettingsDebouncedUpload,
  runCloudSettingsPoll,
} from "./background/cloudSettingsAutoSync";
import { isAllowedFetchUrl } from "@/seqta/utils/allowedFetchUrl";

/**
 * Session-only dev-mode override of the content API base.
 *
 * Stored in a module-level variable (not `chrome.storage`) so it is wiped
 * automatically when the browser/service-worker process restarts. Content
 * scripts re-sync this on every page load via `setDevApiBase` so the value
 * survives transient service-worker terminations within the same browser
 * session.
 */
const DEFAULT_API_BASE = "https://betterseqta.org";
let DEV_API_BASE: string | null = null;
function apiBase(): string {
  return DEV_API_BASE ?? DEFAULT_API_BASE;
}

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

async function getAccessTokenFromStorage(): Promise<string | null> {
  const { bsplus_token } = await browser.storage.local.get("bsplus_token");
  return typeof bsplus_token === "string" && bsplus_token.length > 0 ? bsplus_token : null;
}

/** Accept API + GitHub fallback shapes; always return `{ success, data?: { themes } }`. */
function normalizeFetchThemesResponse(json: unknown): {
  success: boolean;
  data?: { themes: unknown[] };
  error?: string;
} {
  if (!json || typeof json !== "object") {
    return { success: false, error: "Invalid themes response" };
  }
  const body = json as Record<string, unknown>;
  if (body.success === false) {
    return {
      success: false,
      error: typeof body.error === "string" ? body.error : "Failed to fetch themes",
    };
  }
  const data = body.data;
  let themes: unknown[] | null = null;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = (data as Record<string, unknown>).themes;
    if (Array.isArray(nested)) themes = nested;
  } else if (Array.isArray(data)) {
    themes = data;
  }
  if (!themes && Array.isArray(body.themes)) {
    themes = body.themes;
  }
  if (!themes) {
    return { success: false, error: "Themes list missing from response" };
  }
  return { success: true, data: { themes } };
}

function handleFetchThemes(request: any, sendResponse: MessageSender): boolean {
  void (async () => {
    const token = await getAccessTokenFromStorage();
    const apiUrl = `${apiBase()}/api/themes?type=betterseqta&limit=100&nocache=${Date.now()}`;
    const githubUrl = `https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes.json?nocache=${Date.now()}`;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(apiUrl, { cache: "no-store", headers })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) {
          throw new Error(
            (json && typeof json === "object" && "error" in json && typeof (json as { error?: string }).error === "string"
              ? (json as { error: string }).error
              : null) ?? `Themes API HTTP ${r.status}`,
          );
        }
        return normalizeFetchThemesResponse(json);
      })
      .then(sendResponse)
      .catch((err) => {
        console.warn("[Background] fetchThemes API failed, trying GitHub fallback:", err?.message);
        fetch(githubUrl, { cache: "no-store" })
          .then(async (r) => {
            if (!r.ok) throw new Error(`GitHub fallback HTTP ${r.status}`);
            const data = await r.json();
            const themes = Array.isArray(data) ? data : (data?.themes ?? []);
            return normalizeFetchThemesResponse({ success: true, data: { themes } });
          })
          .then(sendResponse)
          .catch((fallbackErr) => {
            console.error("[Background] fetchThemes GitHub fallback error:", fallbackErr);
            sendResponse({ success: false, error: fallbackErr?.message });
          });
      });
  })();
  return true;
}

function handleFetchThemeDetails(request: any, sendResponse: MessageSender): boolean {
  const { themeId } = request;
  if (!themeId || typeof themeId !== "string") {
    sendResponse({ success: false, error: "Missing themeId" });
    return false;
  }
  void (async () => {
    const token = await getAccessTokenFromStorage();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${apiBase()}/api/themes/${themeId}`, { cache: "no-store", headers })
      .then((r) => r.json())
      .then(sendResponse)
      .catch((err) => {
        console.error("[Background] fetchThemeDetails error:", err);
        sendResponse({ success: false, error: err?.message });
      });
  })();
  return true;
}

function isTrustedSender(sender?: browser.Runtime.MessageSender): boolean {
  if (!sender) return false;
  if (sender.id && sender.id !== browser.runtime.id) return false;

  const urls = [sender.url, sender.tab?.url].filter(Boolean) as string[];
  for (const pageUrl of urls) {
    if (/^chrome-extension:\/\//.test(pageUrl) || /^moz-extension:\/\//.test(pageUrl)) {
      return true;
    }
    try {
      if (isSeqtaOrigin(new URL(pageUrl).origin)) return true;
    } catch {
      // try next URL
    }
  }
  return false;
}

function handleFetchFromUrl(
  request: any,
  sendResponse: MessageSender,
  sender?: browser.Runtime.MessageSender,
): boolean {
  if (!isTrustedSender(sender)) {
    sendResponse({ error: "Unauthorized sender" });
    return false;
  }
  const { url } = request;
  if (!url || typeof url !== "string") {
    sendResponse({ error: "Missing url" });
    return false;
  }
  if (!isAllowedFetchUrl(url)) {
    sendResponse({ error: "URL not allowed" });
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

function handleCloudLogin(
  request: any,
  sendResponse: MessageSender,
  sender?: browser.Runtime.MessageSender,
): boolean {
  if (!isTrustedSender(sender)) {
    sendResponse({ error: "Unauthorized sender" });
    return false;
  }
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

function handleCloudStartLogin(request: any, sendResponse: MessageSender): boolean {
  const { client_id, redirect_uri } = request;
  if (!client_id || !redirect_uri) {
    sendResponse({ error: "Missing client_id or redirect_uri" });
    return true;
  }
  const authorizeUrl = `https://accounts.betterseqta.org/login?redirect=${encodeURIComponent(`/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}`)}`;
  browser.tabs.create({ url: authorizeUrl }).then(() => {
    sendResponse({ success: true });
  }).catch((err) => {
    console.error("[Background] cloudStartLogin error:", err);
    sendResponse({ error: err?.message ?? "Failed to open login page" });
  });
  return true;
}

const CALLBACK_URL_PREFIX = "https://accounts.betterseqta.org/auth/bsplus/callback";

function initCloudLoginCallbackListener() {
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && changeInfo.url.startsWith(CALLBACK_URL_PREFIX)) {
      try {
        const url = new URL(changeInfo.url);
        const token = url.searchParams.get("token");
        const refreshToken = url.searchParams.get("refresh_token");
        const userId = url.searchParams.get("user_id");

        if (token && refreshToken) {
          // Store tokens
          void (async () => {
            try {
              await browser.storage.local.set({
                bsplus_token: token,
                bsplus_refresh_token: refreshToken,
              });

              // Fetch full user info
              const userRes = await fetch("https://accounts.betterseqta.org/api/auth/me", {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (userRes.ok) {
                const user = await userRes.json();
                await browser.storage.local.set({ bsplus_user: user });
              } else if (userId) {
                await browser.storage.local.set({ bsplus_user: { id: userId } });
              }

              // Trigger cloud settings download
              void performCloudSettingsDownloadWithRetry(token).catch((err) => {
                console.warn("[Background] Cloud settings download after login:", err);
              });
            } catch (err) {
              console.error("[Background] Failed to process login callback:", err);
            }
          })();

          // Close the callback tab
          void browser.tabs.remove(tabId);
        }
      } catch (err) {
        console.error("[Background] Error parsing callback URL:", err);
      }
    }
  });
}

initCloudLoginCallbackListener();

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

function handleCloudSettingsUpload(
  request: any,
  sendResponse: MessageSender,
  sender?: browser.Runtime.MessageSender,
): boolean {
  if (!isTrustedSender(sender)) {
    sendResponse({ success: false, error: "Unauthorized sender" });
    return false;
  }
  void (async () => {
    try {
      const token = await getAccessTokenFromStorage();
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

function handleCloudSettingsDownload(
  request: any,
  sendResponse: MessageSender,
  sender?: browser.Runtime.MessageSender,
): boolean {
  if (!isTrustedSender(sender)) {
    sendResponse({ success: false, error: "Unauthorized sender" });
    return false;
  }
  void (async () => {
    try {
      const token = await getAccessTokenFromStorage();
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
  const { themeId, action } = request;
  if (!themeId) {
    sendResponse({ success: false, error: "Theme ID required" });
    return false;
  }
  void (async () => {
    const token = await getAccessTokenFromStorage();
    if (!token) {
      sendResponse({ success: false, error: "Not authenticated" });
      return;
    }
    const isFavorite = action === "favorite";
    fetch(`${apiBase()}/api/themes/${themeId}/favorite`, {
      method: isFavorite ? "POST" : "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(sendResponse)
      .catch((err) => {
        console.error("[Background] cloudFavorite error:", err);
        sendResponse({ success: false, error: err?.message });
      });
  })();
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

function handleSetDevApiBase(
  request: any,
  _sendResponse: MessageSender,
  sender?: browser.Runtime.MessageSender,
): boolean {
  if (!isTrustedSender(sender)) return false;
  const url = typeof request?.url === "string" ? request.url.trim() : null;
  if (url && /^https?:\/\//.test(url)) {
    DEV_API_BASE = url.replace(/\/$/, "");
  } else {
    DEV_API_BASE = null;
  }
  return false;
}

const MESSAGE_HANDLERS: Record<string, MessageHandler> = {
  reloadTabs: () => reloadSeqtaPages(),
  setDevApiBase: handleSetDevApiBase,
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
  ensureStorageDefaults: (_req, sendResponse) => {
    void ensureSyncableStorageDefaults()
      .then(() => sendResponse({ ok: true }))
      .catch((e) => {
        console.warn("[BetterSEQTA+] ensureStorageDefaults failed:", e);
        sendResponse({ ok: false });
      });
    return true;
  },
  sendNews: (req, sendResponse, sender) => {
    if (!isTrustedSender(sender)) {
      sendResponse({ error: "Unauthorized sender" });
      return false;
    }
    fetchNews(req.source ?? "australia", sendResponse);
    return true;
  },
  fetchThemes: handleFetchThemes,
  fetchThemeDetails: handleFetchThemeDetails,
  fetchFromUrl: handleFetchFromUrl,
  cloudReserveClient: handleCloudReserveClient,
  cloudLogin: handleCloudLogin,
  cloudStartLogin: handleCloudStartLogin,
  cloudRefresh: handleCloudRefresh,
  cloudFavorite: handleCloudFavorite,
  cloudSettingsUpload: handleCloudSettingsUpload,
  cloudSettingsDownload: handleCloudSettingsDownload,
  cloudSettingsPoll: () => {
    void runCloudSettingsPoll();
    return false;
  },
  cloudSettingsRequestDebouncedUpload: () => {
    requestCloudSettingsDebouncedUpload();
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

function getDefaultValues(): SettingsState {
  return getDefaultSettingsState();
}

function SetStorageValue(object: any) {
  for (var i in object) {
    browser.storage.local.set({ [i]: object[i] });
  }
}

/** One-time migration for 3.6.5: opt upgraders into Global Search + indexing + transparency defaults. */
const GLOBAL_SEARCH_PLUGIN_SETTINGS_KEY = "plugin.global-search.settings";
const GLOBAL_SEARCH_MIGRATION_VERSION = "3.6.5";

async function migrateGlobalSearchDefaultsFor365Upgrade(
  previousVersion: string,
): Promise<void> {
  try {
    const currRaw = browser.runtime.getManifest().version;
    const prev = semver.coerce(previousVersion);
    const curr = semver.coerce(currRaw);
    if (
      prev == null ||
      curr == null ||
      semver.lt(curr, GLOBAL_SEARCH_MIGRATION_VERSION) ||
      !semver.lt(prev, GLOBAL_SEARCH_MIGRATION_VERSION)
    ) {
      return;
    }

    const got = await browser.storage.local.get(GLOBAL_SEARCH_PLUGIN_SETTINGS_KEY);
    const existing = (got[GLOBAL_SEARCH_PLUGIN_SETTINGS_KEY] ?? {}) as Record<
      string,
      unknown
    >;

    await browser.storage.local.set({
      [GLOBAL_SEARCH_PLUGIN_SETTINGS_KEY]: {
        ...existing,
        enabled: true,
        transparencyEffects: true,
        runIndexingOnLoad: true,
        passiveIndexing: true,
      },
    });

    console.info(
      `[BetterSEQTA+] Migration ${GLOBAL_SEARCH_MIGRATION_VERSION}: Global Search and related settings enabled (from ${previousVersion}).`,
    );
  } catch (e) {
    console.warn("[BetterSEQTA+] Global Search 3.6.5 settings migration failed:", e);
  }
}

/** One-time reset for 3.6.6: re-enable Theme of the Month for existing users. */
const THEME_OF_THE_MONTH_RESET_VERSION = "3.6.6";

async function resetThemeOfTheMonthDisabledFor366Upgrade(
  previousVersion: string,
): Promise<void> {
  try {
    const currRaw = browser.runtime.getManifest().version;
    const prev = semver.coerce(previousVersion);
    const curr = semver.coerce(currRaw);
    if (
      prev == null ||
      curr == null ||
      semver.lt(curr, THEME_OF_THE_MONTH_RESET_VERSION) ||
      !semver.lt(prev, THEME_OF_THE_MONTH_RESET_VERSION)
    ) {
      return;
    }

    await browser.storage.local.set({
      themeOfTheMonthDisabled: false,
      themeOfTheMonthLastSeenId: undefined,
    });

    console.info(
      `[BetterSEQTA+] Migration ${THEME_OF_THE_MONTH_RESET_VERSION}: Theme of the Month re-enabled (from ${previousVersion}).`,
    );
  } catch (e) {
    console.warn(
      "[BetterSEQTA+] Theme of the Month 3.6.6 reset migration failed:",
      e,
    );
  }
}

/** 3.7.0: Close no longer marks entries seen — clear legacy dismissal keys. */
const THEME_OF_THE_MONTH_RELOAD_VERSION = "3.7.0";

async function resetThemeOfTheMonthDismissalFor370Upgrade(
  previousVersion: string,
): Promise<void> {
  try {
    const currRaw = browser.runtime.getManifest().version;
    const prev = semver.coerce(previousVersion);
    const curr = semver.coerce(currRaw);
    if (
      prev == null ||
      curr == null ||
      semver.lt(curr, THEME_OF_THE_MONTH_RELOAD_VERSION) ||
      !semver.lt(prev, THEME_OF_THE_MONTH_RELOAD_VERSION)
    ) {
      return;
    }

    await browser.storage.local.set({
      themeOfTheMonthLastSeenId: undefined,
      themeOfTheMonthDismissedMonth: undefined,
    });

    console.info(
      `[BetterSEQTA+] Migration ${THEME_OF_THE_MONTH_RELOAD_VERSION}: Theme of the Month shows again until dismissed for the month (from ${previousVersion}).`,
    );
  } catch (e) {
    console.warn(
      "[BetterSEQTA+] Theme of the Month 3.7.0 dismissal migration failed:",
      e,
    );
  }
}

browser.runtime.onInstalled.addListener(function (event) {
  browser.storage.local.remove(["justupdated"]);
  browser.storage.local.remove(["data"]);

  void ensureSyncableStorageDefaults();

  if (event.reason == "install" || event.reason == "update") {
    browser.storage.local.set({ justupdated: true });
  }

  if (event.reason === "update" && event.previousVersion) {
    void migrateGlobalSearchDefaultsFor365Upgrade(event.previousVersion);
    void resetThemeOfTheMonthDisabledFor366Upgrade(event.previousVersion);
    void resetThemeOfTheMonthDismissalFor370Upgrade(event.previousVersion);
  }
});

browser.runtime.onStartup.addListener(() => {
  void ensureSyncableStorageDefaults();
});

initCloudSettingsAutoSync({ reloadSeqtaPages });
void ensureSyncableStorageDefaults();
