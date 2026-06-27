import browser from "webextension-polyfill";
import {
  GOOGLE_AUTH_URL,
  GOOGLE_CALENDAR_OAUTH_CALLBACK,
  GOOGLE_CALENDAR_SCOPE,
  GOOGLE_OAUTH_CLIENT_ID,
  googleOAuthRedirectUriHint,
  isGoogleCalendarConfigured,
} from "@/config/googleCalendar";
import {
  exchangeGoogleCodeViaAccounts,
  refreshGoogleTokenViaAccounts,
} from "@/seqta/utils/googleCalendar/accountsToken";
import {
  clearGoogleCalendarState,
  readGoogleCalendarState,
  writeGoogleCalendarState,
} from "@/seqta/utils/googleCalendar/storage";
import {
  clampSyncWeeks,
  getAutoSyncWeekly,
  getSyncWeeksAhead,
} from "@/seqta/utils/calendarSync/settings";
import {
  readSharedCalendarSyncSettings,
  writeSharedCalendarSyncSettings,
} from "@/seqta/utils/calendarSync/sharedSettings";
import type {
  GoogleCalendarStatus,
  GoogleCalendarSyncResult,
} from "@/seqta/utils/googleCalendar/types";
import { ensureWeeklySyncAlarm, initCalendarBackground } from "./calendarWeekly";

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(input: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(input);
  return crypto.subtle.digest("SHA-256", data);
}

function randomVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer);
}

async function pkceChallenge(verifier: string): Promise<string> {
  return base64UrlEncode(await sha256(verifier));
}

function parseRedirectCode(responseUrl: string): string {
  const url = new URL(responseUrl);
  const err = url.searchParams.get("error");
  if (err) throw new Error(url.searchParams.get("error_description") ?? err);
  const code = url.searchParams.get("code");
  if (!code) throw new Error("Google sign-in did not return an authorization code.");
  return code;
}

const GOOGLE_OAUTH_CALLBACK_PREFIX = GOOGLE_CALENDAR_OAUTH_CALLBACK;
const GOOGLE_OAUTH_TIMEOUT_MS = 10 * 60 * 1000;

function isGoogleOAuthCallbackUrl(url: string): boolean {
  if (!url.startsWith(GOOGLE_OAUTH_CALLBACK_PREFIX)) return false;
  const parsed = new URL(url);
  return parsed.searchParams.has("code") || parsed.searchParams.has("error");
}

/** Tab-based OAuth (same pattern as cloud login) — launchWebAuthFlow does not reliably return external redirect URLs. */
function waitForGoogleOAuthCallback(authTabId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Google sign-in timed out. Close the tab and try again."));
    }, GOOGLE_OAUTH_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeoutId);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.tabs.onRemoved.removeListener(onRemoved);
    };

    const finishFromUrl = (url: string, tabId: number) => {
      if (!isGoogleOAuthCallbackUrl(url)) return false;
      cleanup();
      void browser.tabs.remove(tabId).catch(() => {});
      resolve(url);
      return true;
    };

    const onRemoved = (tabId: number) => {
      if (tabId !== authTabId) return;
      cleanup();
      reject(new Error("Google sign-in was cancelled."));
    };

    const onUpdated = (
      tabId: number,
      changeInfo: browser.Tabs.OnUpdatedChangeInfoType,
      tab: browser.Tabs.Tab,
    ) => {
      if (tabId !== authTabId) return;
      const url =
        changeInfo.url ?? (changeInfo.status === "complete" ? tab.url : undefined);
      if (url) finishFromUrl(url, tabId);
    };

    browser.tabs.onUpdated.addListener(onUpdated);
    browser.tabs.onRemoved.addListener(onRemoved);

    void browser.tabs
      .get(authTabId)
      .then((tab) => {
        if (tab.url) finishFromUrl(tab.url, authTabId);
      })
      .catch(() => {});
  });
}

async function openGoogleOAuthTab(authUrl: string): Promise<string> {
  const tab = await browser.tabs.create({ url: authUrl, active: true });
  if (tab.id === undefined) {
    throw new Error("Could not open Google sign-in tab.");
  }
  return waitForGoogleOAuthCallback(tab.id);
}

async function getValidAccessToken(): Promise<string> {
  const state = await readGoogleCalendarState();
  const now = Date.now();
  if (state.accessToken && state.expiresAt && state.expiresAt > now + 60_000) {
    return state.accessToken;
  }
  if (!state.refreshToken) {
    throw new Error("Not connected to Google Calendar.");
  }
  const refreshed = await refreshGoogleTokenViaAccounts(state.refreshToken);
  const expiresAt = refreshed.expires_in
    ? Date.now() + refreshed.expires_in * 1000
    : Date.now() + 3_600_000;
  await writeGoogleCalendarState({
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? state.refreshToken,
    expiresAt,
  });
  return refreshed.access_token;
}

async function connectGoogleCalendar(): Promise<GoogleCalendarSyncResult> {
  if (!isGoogleCalendarConfigured()) {
    return {
      success: false,
      configured: false,
      error: "Google Calendar is not configured in this extension build.",
    };
  }

  const redirectUri = GOOGLE_CALENDAR_OAUTH_CALLBACK;
  const verifier = randomVerifier();
  const challenge = await pkceChallenge(verifier);
  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", GOOGLE_OAUTH_CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", GOOGLE_CALENDAR_SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  let responseUrl: string;
  try {
    responseUrl = await openGoogleOAuthTab(authUrl.toString());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google sign-in failed";
    const mismatch =
      /redirect_uri_mismatch|invalid_request/i.test(message) ||
      /redirect_uri_mismatch|invalid_request/i.test(String(err));
    return {
      success: false,
      configured: true,
      error: mismatch
        ? `Google redirect URI mismatch. ${googleOAuthRedirectUriHint()}`
        : message.includes("cancel")
          ? "Google sign-in was cancelled."
          : message,
    };
  }

  try {
    const code = parseRedirectCode(responseUrl);
    const tokens = await exchangeGoogleCodeViaAccounts(code, redirectUri, verifier);
    const expiresAt = tokens.expires_in
      ? Date.now() + tokens.expires_in * 1000
      : Date.now() + 3_600_000;

    const existing = await readGoogleCalendarState();
    await writeGoogleCalendarState({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? existing.refreshToken,
      expiresAt,
      connectedAt: Date.now(),
    });

    await ensureWeeklySyncAlarm();

    return { success: true, configured: true, connected: true };
  } catch (err) {
    return {
      success: false,
      configured: true,
      error: err instanceof Error ? err.message : "Google sign-in failed",
    };
  }
}

async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  const state = await readGoogleCalendarState();
  const shared = await readSharedCalendarSyncSettings();
  const syncWeeksAhead = await getSyncWeeksAhead();
  const autoSyncWeekly = await getAutoSyncWeekly();
  return {
    configured: isGoogleCalendarConfigured(),
    connected: !!(state.refreshToken || state.accessToken),
    lastSyncAt: state.lastSyncAt,
    lastWeeklySyncAt: shared.lastWeeklySyncAt,
    lastSyncOrigin: state.lastSyncOrigin,
    syncWeeksAhead,
    autoSyncWeekly,
  };
}

export async function handleGoogleCalendarConnect(): Promise<GoogleCalendarSyncResult> {
  return connectGoogleCalendar();
}

export async function handleGoogleCalendarDisconnect(): Promise<{ success: boolean }> {
  await clearGoogleCalendarState();
  await ensureWeeklySyncAlarm();
  return { success: true };
}

export async function handleGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  return getGoogleCalendarStatus();
}

export function registerGoogleCalendarMessageHandlers(
  handlers: Record<
    string,
    (
      request: unknown,
      sendResponse: (response?: unknown) => void,
      sender?: browser.Runtime.MessageSender,
    ) => boolean | void
  >,
  isTrustedSender: (sender?: browser.Runtime.MessageSender) => boolean,
): void {
  const rejectUntrusted = (
    sendResponse: (response?: unknown) => void,
    sender?: browser.Runtime.MessageSender,
  ): boolean => {
    if (isTrustedSender(sender)) return false;
    sendResponse({ success: false, error: "Unauthorized sender" });
    return true;
  };

  handlers.googleCalendarConnect = (_req, sendResponse, sender) => {
    if (rejectUntrusted(sendResponse, sender)) return false;
    void handleGoogleCalendarConnect()
      .then(sendResponse)
      .catch((err) => {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Google sign-in failed",
        });
      });
    return true;
  };

  handlers.googleCalendarDisconnect = (_req, sendResponse, sender) => {
    if (rejectUntrusted(sendResponse, sender)) return false;
    void handleGoogleCalendarDisconnect()
      .then(sendResponse)
      .catch((err) => {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Disconnect failed",
        });
      });
    return true;
  };

  handlers.googleCalendarStatus = (_req, sendResponse, sender) => {
    if (rejectUntrusted(sendResponse, sender)) return false;
    void handleGoogleCalendarStatus()
      .then(sendResponse)
      .catch(() => {
        sendResponse({ configured: isGoogleCalendarConfigured(), connected: false });
      });
    return true;
  };

  handlers.googleCalendarGetAccessToken = (_req, sendResponse, sender) => {
    if (rejectUntrusted(sendResponse, sender)) return false;
    void getValidAccessToken()
      .then((accessToken) => sendResponse({ success: true, accessToken }))
      .catch((err) => {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Token refresh failed",
        });
      });
    return true;
  };

  handlers.googleCalendarEnsureWeeklyAlarm = (_req, sendResponse, sender) => {
    if (rejectUntrusted(sendResponse, sender)) return false;
    void ensureWeeklySyncAlarm()
      .then(() => sendResponse({ success: true }))
      .catch((err) => {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Could not schedule weekly sync",
        });
      });
    return true;
  };

  handlers.googleCalendarUpdateSyncSettings = (request, sendResponse, sender) => {
    if (rejectUntrusted(sendResponse, sender)) return false;
    void (async () => {
      const body = request as {
        syncWeeksAhead?: number;
        autoSyncWeekly?: boolean;
      };
      const patch: Record<string, unknown> = {};
      if (body.syncWeeksAhead != null) {
        patch.syncWeeksAhead = clampSyncWeeks(body.syncWeeksAhead);
      }
      if (body.autoSyncWeekly != null) {
        patch.autoSyncWeekly = !!body.autoSyncWeekly;
      }
      if (Object.keys(patch).length > 0) {
        await writeSharedCalendarSyncSettings(patch);
      }
      await ensureWeeklySyncAlarm();
      sendResponse({ success: true, ...(await getGoogleCalendarStatus()) });
    })().catch((err) => {
      sendResponse({
        success: false,
        error: err instanceof Error ? err.message : "Could not update sync settings",
      });
    });
    return true;
  };
}

export { initCalendarBackground as initGoogleCalendarBackground } from "./calendarWeekly";
