import browser from "@/lib/browser";
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
  withSuppressedCloudAutoUpload,
} from "./background/cloudSettingsAutoSync";
import { getBsplusDeviceName } from "@/seqta/utils/bsplusDeviceName";
import { isAllowedFetchUrl } from "@/seqta/utils/allowedFetchUrl";
import {
  initCalendarBackground,
  registerGoogleCalendarMessageHandlers,
  registerOutlookCalendarMessageHandlers,
  type CalendarMessageHandlerMap,
} from "./background/calendarBackground";
import { API_BASE } from "./config/apiBase";
import { createCustomThemesHandlers } from "./background/customThemesHandlers";
import { DEFAULT_BACKGROUND_PENDING_KEY } from "@/seqta/ui/defaultBackgroundKey";
import { handleSearchThemeStockPhotos } from "./background/searchThemeStockPhotos";
import { initTimetableClassmatesBackgroundSync } from "./background/timetableClassmatesSync";
import { runStorageMigrations } from "./background/storageMigrations";

function reloadSeqtaPages() {
  const result = browser.tabs.query({});
  function open(tabs: chrome.tabs.Tab[]) {
    for (const tab of tabs) {
      if (tab.title?.includes("SEQTA Learn") || tab.title?.includes("SEQTA Engage")) {
        browser.tabs.reload(tab.id);
      }
    }
  }
  result.then(open, console.error);
}

/** Callback for sending a response back to the message sender */
type MessageSender = { (response?: unknown): void };

/** Runtime message payloads from extension pages / content scripts */
type BackgroundRequest = Record<string, unknown>;

function reqString(req: BackgroundRequest, key: string): string | undefined {
  const value = req[key];
  return typeof value === "string" ? value : undefined;
}

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

function handleFetchThemes(_request: unknown, sendResponse: MessageSender): boolean {
  void (async () => {
    const token = await getAccessTokenFromStorage();
    const apiUrl = `${API_BASE}/api/themes?type=betterseqta&limit=100&nocache=${Date.now()}`;
    const githubUrl = `https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Themes/main/store/themes.json?nocache=${Date.now()}`;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(apiUrl, { cache: "no-store", headers })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) {
          throw new Error(
            (json &&
            typeof json === "object" &&
            "error" in json &&
            typeof (json as { error?: string }).error === "string"
              ? (json as { error: string }).error
              : null) ?? `Themes API HTTP ${r.status}`,
          );
        }
        return normalizeFetchThemesResponse(json);
      })
      .then(sendResponse)
      .catch((err) => {
        console.warn(
          "[BetterSEQTA+] Background: fetchThemes API failed, trying GitHub fallback:",
          err?.message,
        );
        fetch(githubUrl, { cache: "no-store" })
          .then(async (r) => {
            if (!r.ok) throw new Error(`GitHub fallback HTTP ${r.status}`);
            const data = await r.json();
            const themes = Array.isArray(data) ? data : (data?.themes ?? []);
            return normalizeFetchThemesResponse({ success: true, data: { themes } });
          })
          .then(sendResponse)
          .catch((fallbackErr) => {
            console.error(
              "[BetterSEQTA+] Background: fetchThemes GitHub fallback error:",
              fallbackErr,
            );
            sendResponse({ success: false, error: fallbackErr?.message });
          });
      });
  })();
  return true;
}

function handleFetchThemeDetails(request: BackgroundRequest, sendResponse: MessageSender): boolean {
  const { themeId } = request;
  if (!themeId || typeof themeId !== "string") {
    sendResponse({ success: false, error: "Missing themeId" });
    return false;
  }
  void (async () => {
    const token = await getAccessTokenFromStorage();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${API_BASE}/api/themes/${themeId}`, { cache: "no-store", headers })
      .then((r) => r.json())
      .then(sendResponse)
      .catch((err) => {
        console.error("[BetterSEQTA+] Background: fetchThemeDetails error:", err);
        sendResponse({ success: false, error: err?.message });
      });
  })();
  return true;
}

function isTrustedSender(sender?: chrome.runtime.MessageSender): boolean {
  if (!sender) return false;
  if (sender.id && sender.id !== browser.runtime.id) return false;

  const urls = [sender.url, sender.tab?.url].filter(Boolean) as string[];
  for (const pageUrl of urls) {
    if (pageUrl.startsWith("chrome-extension://") || pageUrl.startsWith("moz-extension://")) {
      return true;
    }
    try {
      if (isSeqtaOrigin(new URL(pageUrl).origin)) return true;
    } catch {}
  }
  return false;
}

const AUTH_FETCH_ORIGINS = [API_BASE, "https://accounts.betterseqta.org"];

function handleFetchFromUrl(
  request: BackgroundRequest,
  sendResponse: MessageSender,
  sender?: chrome.runtime.MessageSender,
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
  if (request.auth === true && !AUTH_FETCH_ORIGINS.includes(new URL(url).origin)) {
    sendResponse({ error: "URL not allowed" });
    return false;
  }
  void (async () => {
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (request.auth === true) {
        const token = await getAccessTokenFromStorage();
        if (!token) {
          sendResponse({ error: "Not authenticated" });
          return;
        }
        headers.Authorization = `Bearer ${token}`;
      }
      const r = await fetch(url, { cache: "no-store", headers });
      const text = await r.text();
      if (!r.ok) {
        sendResponse({
          error: text?.slice(0, 200) || `HTTP ${r.status}`,
          httpStatus: r.status,
        });
        return;
      }
      try {
        sendResponse({ data: text ? JSON.parse(text) : {} });
      } catch {
        sendResponse({ error: "Invalid JSON response" });
      }
    } catch (err) {
      console.error("[BetterSEQTA+] Background: fetchFromUrl error:", err);
      sendResponse({ error: (err as Error)?.message });
    }
  })();
  return true;
}

async function parseJsonResponse(r: Response): Promise<unknown> {
  const text = await r.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function handleCloudReserveClient(
  request: BackgroundRequest,
  sendResponse: MessageSender,
): boolean {
  const redirect_uri =
    request.redirect_uri ?? "https://accounts.betterseqta.org/auth/bsplus/callback";
  fetch("https://accounts.betterseqta.org/api/bsplus/client/reserve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redirect_uri }),
  })
    .then(async (r) => {
      const data = await parseJsonResponse(r);
      const errorText =
        data && typeof data === "object" && "error" in data
          ? String((data as { error?: unknown }).error)
          : undefined;
      if (!r.ok) sendResponse({ error: errorText ?? `Reserve failed (${r.status})` });
      else sendResponse(data);
    })
    .catch((err) => {
      console.error("[BetterSEQTA+] Background: cloudReserveClient error:", err);
      sendResponse({ error: err?.message ?? "Network error" });
    });
  return true;
}

function handleCloudLogin(
  request: BackgroundRequest,
  sendResponse: MessageSender,
  sender?: chrome.runtime.MessageSender,
): boolean {
  if (!isTrustedSender(sender)) {
    sendResponse({ error: "Unauthorized sender" });
    return false;
  }
  const client_id = reqString(request, "client_id");
  const redirect_uri = reqString(request, "redirect_uri");
  const login = reqString(request, "login");
  const password = reqString(request, "password");
  const device_name = reqString(request, "device_name");
  if (!client_id || !redirect_uri || !login || !password) {
    sendResponse({ error: "Missing client_id, redirect_uri, login, or password" });
    return false;
  }
  void (async () => {
    const loginBody: Record<string, string> = {
      client_id,
      redirect_uri,
      login,
      password,
      device_name: device_name ?? (await getBsplusDeviceName()),
    };
    try {
      const r = await fetch("https://accounts.betterseqta.org/api/bsplus/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginBody),
      });
      const data = await parseJsonResponse(r);
      const errorText =
        data && typeof data === "object" && "error" in data
          ? String((data as { error?: unknown }).error)
          : undefined;
      if (!r.ok) sendResponse({ error: errorText ?? "Login failed" });
      else sendResponse(data);
    } catch (err) {
      console.error("[BetterSEQTA+] Background: cloudLogin error:", err);
      sendResponse({ error: (err as Error)?.message ?? "Network error" });
    }
  })();
  return true;
}

function handleCloudStartLogin(request: BackgroundRequest, sendResponse: MessageSender): boolean {
  const client_id = reqString(request, "client_id");
  const redirect_uri = reqString(request, "redirect_uri");
  if (!client_id || !redirect_uri) {
    sendResponse({ error: "Missing client_id or redirect_uri" });
    return true;
  }
  const authorizeUrl = `https://accounts.betterseqta.org/login?redirect=${encodeURIComponent(`/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}`)}`;
  browser.tabs
    .create({ url: authorizeUrl })
    .then(() => {
      sendResponse({ success: true });
    })
    .catch((err) => {
      console.error("[BetterSEQTA+] Background: cloudStartLogin error:", err);
      sendResponse({ error: err?.message ?? "Failed to open login page" });
    });
  return true;
}

const CALLBACK_URL_PREFIX = "https://accounts.betterseqta.org/auth/bsplus/callback";

function initCloudLoginCallbackListener() {
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url && changeInfo.url.startsWith(CALLBACK_URL_PREFIX)) {
      try {
        const url = new URL(changeInfo.url);
        const token = url.searchParams.get("token");
        const refreshToken = url.searchParams.get("refresh_token");
        const userId = url.searchParams.get("user_id");

        if (token && refreshToken) {
          void (async () => {
            try {
              await browser.storage.local.set({
                bsplus_token: token,
                bsplus_refresh_token: refreshToken,
              });

              const userRes = await fetch("https://accounts.betterseqta.org/api/auth/me", {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (userRes.ok) {
                const user = await userRes.json();
                await browser.storage.local.set({ bsplus_user: user });
              } else if (userId) {
                await browser.storage.local.set({ bsplus_user: { id: userId } });
              }

              void performCloudSettingsDownloadWithRetry(token).catch((err) => {
                console.warn(
                  "[BetterSEQTA+] Background: Cloud settings download after login:",
                  err,
                );
              });
            } catch (err) {
              console.error("[BetterSEQTA+] Background: Failed to process login callback:", err);
            }
          })();

          void browser.tabs.remove(tabId);
        }
      } catch (err) {
        console.error("[BetterSEQTA+] Background: Error parsing callback URL:", err);
      }
    }
  });
}

initCloudLoginCallbackListener();

function handleCloudRefresh(request: BackgroundRequest, sendResponse: MessageSender): boolean {
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
      const errorText =
        data && typeof data === "object" && "error" in data
          ? String((data as { error?: unknown }).error)
          : undefined;
      if (!r.ok) sendResponse({ error: errorText ?? "Refresh failed" });
      else sendResponse(data);
    })
    .catch((err) => {
      console.error("[BetterSEQTA+] Background: cloudRefresh error:", err);
      sendResponse({ error: err?.message ?? "Network error" });
    });
  return true;
}

function handleCloudSettingsUpload(
  _request: unknown,
  sendResponse: MessageSender,
  sender?: chrome.runtime.MessageSender,
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
      console.error("[BetterSEQTA+] Background: cloudSettingsUpload error:", err);
      sendResponse({
        success: false,
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  })();
  return true;
}

function handleCloudSettingsDownload(
  _request: unknown,
  sendResponse: MessageSender,
  sender?: chrome.runtime.MessageSender,
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
      console.error("[BetterSEQTA+] Background: cloudSettingsDownload error:", err);
      sendResponse({
        success: false,
        error: err instanceof Error ? err.message : "Download failed",
      });
    }
  })();
  return true;
}

function handleCloudFavorite(request: BackgroundRequest, sendResponse: MessageSender): boolean {
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
    fetch(`${API_BASE}/api/themes/${themeId}/favorite`, {
      method: isFavorite ? "POST" : "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(sendResponse)
      .catch((err) => {
        console.error("[BetterSEQTA+] Background: cloudFavorite error:", err);
        sendResponse({ success: false, error: err?.message });
      });
  })();
  return true;
}

/** Handler for a message type; receives request, sendResponse, and optional sender (for tab routing) */
type MessageHandler = {
  (
    request: BackgroundRequest,
    sendResponse: MessageSender,
    sender?: chrome.runtime.MessageSender,
  ): boolean | void;
};

function isSeqtaOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.hostname.includes("seqta") || u.hostname.endsWith(".edu.au");
  } catch {
    return false;
  }
}

const customThemesHandlers = createCustomThemesHandlers({ getAccessTokenFromStorage });

const MESSAGE_HANDLERS: Record<string, MessageHandler> = {
  ...customThemesHandlers,
  searchThemeStockPhotos: handleSearchThemeStockPhotos,
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
    const source = typeof req.source === "string" ? req.source : undefined;
    void fetchNews(source).then((news) => sendResponse({ news }));
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
  getSeqtaSession: (
    req: { baseUrl?: string },
    sendResponse: MessageSender,
    sender?: chrome.runtime.MessageSender,
  ) => {
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
        const appLink =
          typeof reply?.appLink === "string" && reply.appLink.length > 0 ? reply.appLink : null;
        sendResponse({ appLink });
      } catch (err) {
        console.error("[BetterSEQTA+] Background: getSeqtaSession error:", err);
        sendResponse({ appLink: null });
      }
    })();
    return true;
  },
};

registerGoogleCalendarMessageHandlers(
  MESSAGE_HANDLERS as CalendarMessageHandlerMap,
  isTrustedSender,
);
registerOutlookCalendarMessageHandlers(
  MESSAGE_HANDLERS as CalendarMessageHandlerMap,
  isTrustedSender,
);
initCalendarBackground();

browser.runtime.onMessage.addListener(
  (
    request: BackgroundRequest,
    sender: chrome.runtime.MessageSender,
    sendResponse: MessageSender,
  ) => {
    const handler = MESSAGE_HANDLERS[request.type as string];
    if (!handler) return false;
    if (handler(request, sendResponse, sender) === true) return true;
    sendResponse();
    return false;
  },
);

function getDefaultValues(): SettingsState {
  return getDefaultSettingsState();
}

function SetStorageValue(object: SettingsState) {
  void withSuppressedCloudAutoUpload(() =>
    browser.storage.local.set(object as Record<string, unknown>),
  );
}

browser.runtime.onInstalled.addListener(function (event) {
  browser.storage.local.remove(["justupdated", "data"]);

  const defaultsReady = ensureSyncableStorageDefaults();

  if (event.reason == "install" || event.reason == "update") {
    browser.storage.local.set({ justupdated: true });
  }

  if (event.reason === "update" && event.previousVersion) {
    void runStorageMigrations(event.previousVersion);
    reloadSeqtaPages();
  }

  if (event.reason === "install") {
    void browser.storage.local.set({ [DEFAULT_BACKGROUND_PENDING_KEY]: true });
    void defaultsReady
      .catch(() => undefined)
      .then(async () => {
        const key = "plugin.animated-background.settings";
        const { [key]: settings } = await browser.storage.local.get(key);
        await browser.storage.local.set({ [key]: { ...(settings as object), enabled: false } });
      });
  }
});

browser.runtime.onStartup.addListener(() => {
  void ensureSyncableStorageDefaults();
});

initCloudSettingsAutoSync({ reloadSeqtaPages });
initTimetableClassmatesBackgroundSync();
void ensureSyncableStorageDefaults();
