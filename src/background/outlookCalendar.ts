import browser from "webextension-polyfill";
import {
  OUTLOOK_AUTH_URL,
  OUTLOOK_CALENDAR_OAUTH_CALLBACK,
  OUTLOOK_CALENDAR_SCOPE,
  OUTLOOK_OAUTH_CLIENT_ID,
  isOutlookCalendarConfigured,
  outlookOAuthRedirectUriHint,
} from "@/config/outlookCalendar";
import {
  exchangeOutlookCodeViaAccounts,
  refreshOutlookTokenViaAccounts,
} from "@/seqta/utils/outlookCalendar/accountsToken";
import {
  clearOutlookCalendarState,
  readOutlookCalendarState,
  writeOutlookCalendarState,
} from "@/seqta/utils/outlookCalendar/storage";
import type { OutlookCalendarStatus } from "@/seqta/utils/outlookCalendar/types";
import type { GoogleCalendarSyncResult } from "@/seqta/utils/googleCalendar/types";
import { ensureWeeklySyncAlarm } from "./calendarWeekly";

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
  if (!code) throw new Error("Microsoft sign-in did not return an authorization code.");
  return code;
}

const OAUTH_CALLBACK_PREFIX = OUTLOOK_CALENDAR_OAUTH_CALLBACK;
const OAUTH_TIMEOUT_MS = 10 * 60 * 1000;

function isOAuthCallbackUrl(url: string): boolean {
  if (!url.startsWith(OAUTH_CALLBACK_PREFIX)) return false;
  const parsed = new URL(url);
  return parsed.searchParams.has("code") || parsed.searchParams.has("error");
}

function waitForOAuthCallback(authTabId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Microsoft sign-in timed out. Close the tab and try again."));
    }, OAUTH_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeoutId);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.tabs.onRemoved.removeListener(onRemoved);
    };

    const finishFromUrl = (url: string, tabId: number) => {
      if (!isOAuthCallbackUrl(url)) return false;
      cleanup();
      void browser.tabs.remove(tabId).catch(() => {});
      resolve(url);
      return true;
    };

    const onRemoved = (tabId: number) => {
      if (tabId !== authTabId) return;
      cleanup();
      reject(new Error("Microsoft sign-in was cancelled."));
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

async function openOAuthTab(authUrl: string): Promise<string> {
  const tab = await browser.tabs.create({ url: authUrl, active: true });
  if (tab.id === undefined) {
    throw new Error("Could not open Microsoft sign-in tab.");
  }
  return waitForOAuthCallback(tab.id);
}

async function getValidAccessToken(): Promise<string> {
  const state = await readOutlookCalendarState();
  const now = Date.now();
  if (state.accessToken && state.expiresAt && state.expiresAt > now + 60_000) {
    return state.accessToken;
  }
  if (!state.refreshToken) {
    throw new Error("Not connected to Outlook Calendar.");
  }
  const refreshed = await refreshOutlookTokenViaAccounts(state.refreshToken);
  const expiresAt = refreshed.expires_in
    ? Date.now() + refreshed.expires_in * 1000
    : Date.now() + 3_600_000;
  await writeOutlookCalendarState({
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? state.refreshToken,
    expiresAt,
  });
  return refreshed.access_token;
}

async function connectOutlookCalendar(): Promise<GoogleCalendarSyncResult> {
  if (!isOutlookCalendarConfigured()) {
    return {
      success: false,
      configured: false,
      error: "Outlook Calendar is not configured in this extension build.",
    };
  }

  const redirectUri = OUTLOOK_CALENDAR_OAUTH_CALLBACK;
  const verifier = randomVerifier();
  const challenge = await pkceChallenge(verifier);
  const authUrl = new URL(OUTLOOK_AUTH_URL);
  authUrl.searchParams.set("client_id", OUTLOOK_OAUTH_CLIENT_ID);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", OUTLOOK_CALENDAR_SCOPE);
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  let responseUrl: string;
  try {
    responseUrl = await openOAuthTab(authUrl.toString());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Microsoft sign-in failed";
    const mismatch =
      /redirect_uri|invalid_request|AADSTS50011/i.test(message) ||
      /redirect_uri|invalid_request|AADSTS50011/i.test(String(err));
    return {
      success: false,
      configured: true,
      error: mismatch
        ? `Microsoft redirect URI mismatch. ${outlookOAuthRedirectUriHint()}`
        : message.includes("cancel")
          ? "Microsoft sign-in was cancelled."
          : message,
    };
  }

  try {
    const code = parseRedirectCode(responseUrl);
    const tokens = await exchangeOutlookCodeViaAccounts(code, redirectUri, verifier);
    const expiresAt = tokens.expires_in
      ? Date.now() + tokens.expires_in * 1000
      : Date.now() + 3_600_000;

    const existing = await readOutlookCalendarState();
    await writeOutlookCalendarState({
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
      error: err instanceof Error ? err.message : "Microsoft sign-in failed",
    };
  }
}

async function getOutlookCalendarStatus(): Promise<OutlookCalendarStatus> {
  const state = await readOutlookCalendarState();
  return {
    configured: isOutlookCalendarConfigured(),
    connected: !!(state.refreshToken || state.accessToken),
    lastSyncAt: state.lastSyncAt,
    lastSyncOrigin: state.lastSyncOrigin,
  };
}

export async function handleOutlookCalendarConnect(): Promise<GoogleCalendarSyncResult> {
  return connectOutlookCalendar();
}

export async function handleOutlookCalendarDisconnect(): Promise<{ success: boolean }> {
  await clearOutlookCalendarState();
  await ensureWeeklySyncAlarm();
  return { success: true };
}

export async function handleOutlookCalendarStatus(): Promise<OutlookCalendarStatus> {
  return getOutlookCalendarStatus();
}

export function registerOutlookCalendarMessageHandlers(
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

  handlers.outlookCalendarConnect = (_req, sendResponse, sender) => {
    if (rejectUntrusted(sendResponse, sender)) return false;
    void handleOutlookCalendarConnect()
      .then(sendResponse)
      .catch((err) => {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Microsoft sign-in failed",
        });
      });
    return true;
  };

  handlers.outlookCalendarDisconnect = (_req, sendResponse, sender) => {
    if (rejectUntrusted(sendResponse, sender)) return false;
    void handleOutlookCalendarDisconnect()
      .then(sendResponse)
      .catch((err) => {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Disconnect failed",
        });
      });
    return true;
  };

  handlers.outlookCalendarStatus = (_req, sendResponse, sender) => {
    if (rejectUntrusted(sendResponse, sender)) return false;
    void handleOutlookCalendarStatus()
      .then(sendResponse)
      .catch(() => {
        sendResponse({ configured: isOutlookCalendarConfigured(), connected: false });
      });
    return true;
  };

  handlers.outlookCalendarGetAccessToken = (_req, sendResponse, sender) => {
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
}
