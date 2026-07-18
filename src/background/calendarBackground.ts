import {
  GOOGLE_AUTH_URL,
  GOOGLE_CALENDAR_ACCOUNTS_NOT_READY_HINT,
  GOOGLE_CALENDAR_OAUTH_CALLBACK,
  GOOGLE_CALENDAR_REFRESH_URL,
  GOOGLE_CALENDAR_SCOPE,
  GOOGLE_CALENDAR_TOKEN_URL,
  GOOGLE_OAUTH_CLIENT_ID,
  googleOAuthRedirectUriHint,
  isGoogleCalendarConfigured,
} from "@/config/googleCalendar";
import {
  OUTLOOK_AUTH_URL,
  OUTLOOK_CALENDAR_ACCOUNTS_NOT_READY_HINT,
  OUTLOOK_CALENDAR_OAUTH_CALLBACK,
  OUTLOOK_CALENDAR_REFRESH_URL,
  OUTLOOK_CALENDAR_SCOPE,
  OUTLOOK_CALENDAR_TOKEN_URL,
  OUTLOOK_OAUTH_CLIENT_ID,
  isOutlookCalendarConfigured,
  outlookOAuthRedirectUriHint,
} from "@/config/outlookCalendar";
import {
  exchangeAccountsCode,
  refreshAccountsToken,
  type AccountsTokenPayload,
} from "@/seqta/utils/calendarSync/accountsToken";
import {
  CALENDAR_WEEKLY_ALARM,
  clampSyncWeeks,
  getAutoSyncWeekly,
  getSyncWeeksAhead,
  isAnyCalendarConnected,
  markWeeklySyncPending,
  readSharedCalendarSyncSettings,
  writeSharedCalendarSyncSettings,
} from "@/seqta/utils/calendarSync/settings";
import {
  clearGoogleCalendarState,
  readGoogleCalendarState,
  writeGoogleCalendarState,
} from "@/seqta/utils/googleCalendar/storage";
import { ensureGoogleAppCalendar } from "@/seqta/utils/googleCalendar/calendarProvisioning";
import type {
  GoogleCalendarStatus,
  GoogleCalendarSyncResult,
} from "@/seqta/utils/googleCalendar/types";
import {
  clearOutlookCalendarState,
  readOutlookCalendarState,
  writeOutlookCalendarState,
} from "@/seqta/utils/outlookCalendar/storage";
import type { OutlookCalendarStatus } from "@/seqta/utils/outlookCalendar/storage";
import browser from "webextension-polyfill";

const WEEKLY_PERIOD_MINUTES = 7 * 24 * 60;

export type CalendarMessageHandler = (
  request: unknown,
  sendResponse: (response?: unknown) => void,
  sender?: browser.Runtime.MessageSender,
) => boolean | void;

export type CalendarMessageHandlerMap = Record<string, CalendarMessageHandler>;

type StoredTokens = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  lastSyncAt?: number;
  lastSyncOrigin?: string;
};

type OAuthTabFlowOptions = {
  callbackPrefix: string;
  timeoutMessage: string;
  cancelledMessage: string;
  tabOpenErrorMessage: string;
  timeoutMs?: number;
};

type CalendarProviderBackend = {
  label: string;
  isConfigured: () => boolean;
  redirectHint: () => string;
  mismatchRe: RegExp;
  authUrl: string;
  clientId: string;
  scope: string;
  callback: string;
  tabOpts: Omit<OAuthTabFlowOptions, "callbackPrefix">;
  notConfiguredError: string;
  notConnectedError: string;
  signInFailed: string;
  read: () => Promise<StoredTokens>;
  write: (patch: Partial<StoredTokens> & { connectedAt?: number }) => Promise<unknown>;
  clear: () => Promise<unknown>;
  exchange: (code: string, redirectUri: string, verifier: string) => Promise<AccountsTokenPayload>;
  refresh: (refreshToken: string) => Promise<AccountsTokenPayload>;
  applyAuthParams: (authUrl: URL) => void;
  messagePrefix: string;
  afterConnect?: (accessToken: string) => Promise<Partial<StoredTokens>>;
};

function createProviderBackend(
  config: Omit<CalendarProviderBackend, "exchange" | "refresh"> & {
    tokenUrl: string;
    refreshUrl: string;
    notReadyHint: string;
    includeErrorDescription?: boolean;
  },
): CalendarProviderBackend {
  const { tokenUrl, refreshUrl, notReadyHint, includeErrorDescription, ...backend } = config;
  return {
    ...backend,
    exchange: (code, redirectUri, verifier) =>
      exchangeAccountsCode(tokenUrl, code, redirectUri, verifier, notReadyHint, includeErrorDescription),
    refresh: (refreshToken) =>
      refreshAccountsToken(refreshUrl, refreshToken, notReadyHint, includeErrorDescription),
  };
}

const GOOGLE_BACKEND = createProviderBackend({
  label: "Google",
  isConfigured: isGoogleCalendarConfigured,
  redirectHint: googleOAuthRedirectUriHint,
  mismatchRe: /redirect_uri_mismatch|invalid_request/i,
  authUrl: GOOGLE_AUTH_URL,
  clientId: GOOGLE_OAUTH_CLIENT_ID,
  scope: GOOGLE_CALENDAR_SCOPE,
  callback: GOOGLE_CALENDAR_OAUTH_CALLBACK,
  tabOpts: {
    timeoutMessage: "Google sign-in timed out. Close the tab and try again.",
    cancelledMessage: "Google sign-in was cancelled.",
    tabOpenErrorMessage: "Could not open Google sign-in tab.",
  },
  notConfiguredError: "Google Calendar is not configured in this extension build.",
  notConnectedError: "Not connected to Google Calendar.",
  signInFailed: "Google sign-in failed",
  read: readGoogleCalendarState,
  write: writeGoogleCalendarState,
  clear: clearGoogleCalendarState,
  applyAuthParams(authUrl) {
    authUrl.searchParams.set("access_type", "offline");
  },
  messagePrefix: "googleCalendar",
  tokenUrl: GOOGLE_CALENDAR_TOKEN_URL,
  refreshUrl: GOOGLE_CALENDAR_REFRESH_URL,
  notReadyHint: GOOGLE_CALENDAR_ACCOUNTS_NOT_READY_HINT,
  async afterConnect(accessToken) {
    const state = await readGoogleCalendarState();
    const calendarId = await ensureGoogleAppCalendar(accessToken, state.calendarId);
    return { calendarId };
  },
});

const OUTLOOK_BACKEND = createProviderBackend({
  label: "Microsoft",
  isConfigured: isOutlookCalendarConfigured,
  redirectHint: outlookOAuthRedirectUriHint,
  mismatchRe: /redirect_uri|invalid_request|AADSTS50011/i,
  authUrl: OUTLOOK_AUTH_URL,
  clientId: OUTLOOK_OAUTH_CLIENT_ID,
  scope: OUTLOOK_CALENDAR_SCOPE,
  callback: OUTLOOK_CALENDAR_OAUTH_CALLBACK,
  tabOpts: {
    timeoutMessage: "Microsoft sign-in timed out. Close the tab and try again.",
    cancelledMessage: "Microsoft sign-in was cancelled.",
    tabOpenErrorMessage: "Could not open Microsoft sign-in tab.",
  },
  notConfiguredError: "Outlook Calendar is not configured in this extension build.",
  notConnectedError: "Not connected to Outlook Calendar.",
  signInFailed: "Microsoft sign-in failed",
  read: readOutlookCalendarState,
  write: writeOutlookCalendarState,
  clear: clearOutlookCalendarState,
  applyAuthParams(authUrl) {
    authUrl.searchParams.set("response_mode", "query");
  },
  messagePrefix: "outlookCalendar",
  tokenUrl: OUTLOOK_CALENDAR_TOKEN_URL,
  refreshUrl: OUTLOOK_CALENDAR_REFRESH_URL,
  notReadyHint: OUTLOOK_CALENDAR_ACCOUNTS_NOT_READY_HINT,
  includeErrorDescription: true,
});

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomPkceVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer);
}

async function pkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

function parseOAuthRedirectCode(responseUrl: string, providerLabel: string): string {
  const url = new URL(responseUrl);
  const err = url.searchParams.get("error");
  if (err) throw new Error(url.searchParams.get("error_description") ?? err);
  const code = url.searchParams.get("code");
  if (!code) throw new Error(`${providerLabel} sign-in did not return an authorization code.`);
  return code;
}

function isOAuthCallbackUrl(url: string, callbackPrefix: string): boolean {
  if (!url.startsWith(callbackPrefix)) return false;
  const parsed = new URL(url);
  return parsed.searchParams.has("code") || parsed.searchParams.has("error");
}

function waitForOAuthCallback(authTabId: number, opts: OAuthTabFlowOptions): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(opts.timeoutMessage));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeoutId);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.tabs.onRemoved.removeListener(onRemoved);
    };

    const finishFromUrl = (url: string, tabId: number) => {
      if (!isOAuthCallbackUrl(url, opts.callbackPrefix)) return false;
      cleanup();
      void browser.tabs.remove(tabId).catch(() => {});
      resolve(url);
      return true;
    };

    const onRemoved = (tabId: number) => {
      if (tabId !== authTabId) return;
      cleanup();
      reject(new Error(opts.cancelledMessage));
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

async function openOAuthTab(authUrl: string, opts: OAuthTabFlowOptions): Promise<string> {
  const tab = await browser.tabs.create({ url: authUrl, active: true });
  if (tab.id === undefined) throw new Error(opts.tabOpenErrorMessage);
  return waitForOAuthCallback(tab.id, opts);
}

function tokenExpiresAt(expiresIn?: number): number {
  return expiresIn ? Date.now() + expiresIn * 1000 : Date.now() + 3_600_000;
}

async function getValidStoredAccessToken(
  provider: CalendarProviderBackend,
): Promise<string> {
  const state = await provider.read();
  const now = Date.now();
  if (state.accessToken && state.expiresAt && state.expiresAt > now + 60_000) {
    return state.accessToken;
  }
  if (!state.refreshToken) throw new Error(provider.notConnectedError);
  const refreshed = await provider.refresh(state.refreshToken);
  await provider.write({
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? state.refreshToken,
    expiresAt: tokenExpiresAt(refreshed.expires_in),
  });
  return refreshed.access_token;
}

export function registerTrustedAsyncHandler(
  handlers: CalendarMessageHandlerMap,
  isTrustedSender: (sender?: browser.Runtime.MessageSender) => boolean,
  key: string,
  fn: (request: unknown) => Promise<unknown>,
  onError?: (err: unknown) => unknown,
): void {
  handlers[key] = (request, sendResponse, sender) => {
    if (!isTrustedSender(sender)) {
      sendResponse({ success: false, error: "Unauthorized sender" });
      return false;
    }
    void fn(request)
      .then(sendResponse)
      .catch((err) => {
        sendResponse(
          onError?.(err) ?? {
            success: false,
            error: err instanceof Error ? err.message : "Request failed",
          },
        );
      });
    return true;
  };
}

async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  const [state, shared, syncWeeksAhead, autoSyncWeekly] = await Promise.all([
    readGoogleCalendarState(),
    readSharedCalendarSyncSettings(),
    getSyncWeeksAhead(),
    getAutoSyncWeekly(),
  ]);
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

async function getOutlookCalendarStatus(): Promise<OutlookCalendarStatus> {
  const state = await readOutlookCalendarState();
  return {
    configured: isOutlookCalendarConfigured(),
    connected: !!(state.refreshToken || state.accessToken),
    lastSyncAt: state.lastSyncAt,
    lastSyncOrigin: state.lastSyncOrigin,
  };
}

async function connectCalendar(provider: CalendarProviderBackend): Promise<GoogleCalendarSyncResult> {
  if (!provider.isConfigured()) {
    return { success: false, configured: false, error: provider.notConfiguredError };
  }

  const redirectUri = provider.callback;
  const verifier = randomPkceVerifier();
  const challenge = await pkceChallenge(verifier);
  const authUrl = new URL(provider.authUrl);
  authUrl.searchParams.set("client_id", provider.clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", provider.scope);
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  provider.applyAuthParams(authUrl);

  let responseUrl: string;
  try {
    responseUrl = await openOAuthTab(authUrl.toString(), {
      callbackPrefix: provider.callback,
      ...provider.tabOpts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : provider.signInFailed;
    const mismatch =
      provider.mismatchRe.test(message) || provider.mismatchRe.test(String(err));
    return {
      success: false,
      configured: true,
      error: mismatch
        ? `${provider.label} redirect URI mismatch. ${provider.redirectHint()}`
        : message.includes("cancel")
          ? provider.tabOpts.cancelledMessage
          : message,
    };
  }

  try {
    const code = parseOAuthRedirectCode(responseUrl, provider.label);
    const tokens = await provider.exchange(code, redirectUri, verifier);
    const existing = await provider.read();
    await provider.write({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? existing.refreshToken,
      expiresAt: tokenExpiresAt(tokens.expires_in),
      connectedAt: Date.now(),
    });
    if (provider.afterConnect) {
      const patch = await provider.afterConnect(tokens.access_token);
      if (patch && Object.keys(patch).length > 0) {
        await provider.write(patch);
      }
    }
    await ensureWeeklySyncAlarm();
    return { success: true, configured: true, connected: true };
  } catch (err) {
    return {
      success: false,
      configured: true,
      error: err instanceof Error ? err.message : provider.signInFailed,
    };
  }
}

function registerProviderHandlers(
  handlers: CalendarMessageHandlerMap,
  isTrustedSender: (sender?: browser.Runtime.MessageSender) => boolean,
  provider: CalendarProviderBackend,
  getStatus: () => Promise<unknown>,
): void {
  const { messagePrefix, signInFailed } = provider;
  const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  registerTrustedAsyncHandler(
    handlers,
    isTrustedSender,
    `${messagePrefix}Connect`,
    () => connectCalendar(provider),
    (err) => ({ success: false, error: errMsg(err, signInFailed) }),
  );

  registerTrustedAsyncHandler(
    handlers,
    isTrustedSender,
    `${messagePrefix}Disconnect`,
    async () => {
      await provider.clear();
      await ensureWeeklySyncAlarm();
      return { success: true };
    },
    (err) => ({ success: false, error: errMsg(err, "Disconnect failed") }),
  );

  registerTrustedAsyncHandler(
    handlers,
    isTrustedSender,
    `${messagePrefix}Status`,
    getStatus,
    () => ({ configured: provider.isConfigured(), connected: false }),
  );

  registerTrustedAsyncHandler(
    handlers,
    isTrustedSender,
    `${messagePrefix}GetAccessToken`,
    () => getValidStoredAccessToken(provider).then((accessToken) => ({ success: true, accessToken })),
    (err) => ({ success: false, error: errMsg(err, "Token refresh failed") }),
  );
}

export function registerGoogleCalendarMessageHandlers(
  handlers: CalendarMessageHandlerMap,
  isTrustedSender: (sender?: browser.Runtime.MessageSender) => boolean,
): void {
  registerProviderHandlers(handlers, isTrustedSender, GOOGLE_BACKEND, getGoogleCalendarStatus);

  registerTrustedAsyncHandler(handlers, isTrustedSender, "googleCalendarEnsureWeeklyAlarm", async () => {
    await ensureWeeklySyncAlarm();
    return { success: true };
  }, (err) => ({
    success: false,
    error: err instanceof Error ? err.message : "Could not schedule weekly sync",
  }));

  registerTrustedAsyncHandler(handlers, isTrustedSender, "googleCalendarUpdateSyncSettings", async (request) => {
    const body = request as { syncWeeksAhead?: number; autoSyncWeekly?: boolean };
    const patch: Record<string, unknown> = {};
    if (body.syncWeeksAhead != null) patch.syncWeeksAhead = clampSyncWeeks(body.syncWeeksAhead);
    if (body.autoSyncWeekly != null) patch.autoSyncWeekly = !!body.autoSyncWeekly;
    if (Object.keys(patch).length > 0) await writeSharedCalendarSyncSettings(patch);
    await ensureWeeklySyncAlarm();
    return { success: true, ...(await getGoogleCalendarStatus()) };
  }, (err) => ({
    success: false,
    error: err instanceof Error ? err.message : "Could not update sync settings",
  }));
}

export function registerOutlookCalendarMessageHandlers(
  handlers: CalendarMessageHandlerMap,
  isTrustedSender: (sender?: browser.Runtime.MessageSender) => boolean,
): void {
  registerProviderHandlers(handlers, isTrustedSender, OUTLOOK_BACKEND, getOutlookCalendarStatus);
}

function isSeqtaTab(tab: browser.Tabs.Tab): boolean {
  const title = tab.title ?? "";
  return title.includes("SEQTA Learn") || title.includes("SEQTA Engage");
}

export async function ensureWeeklySyncAlarm(): Promise<void> {
  const [connected, enabled] = await Promise.all([isAnyCalendarConnected(), getAutoSyncWeekly()]);
  if (!connected || !enabled) {
    await browser.alarms.clear(CALENDAR_WEEKLY_ALARM);
    return;
  }
  const existing = await browser.alarms.get(CALENDAR_WEEKLY_ALARM);
  if (!existing) {
    await browser.alarms.create(CALENDAR_WEEKLY_ALARM, { periodInMinutes: WEEKLY_PERIOD_MINUTES });
  }
}

async function triggerWeeklySyncOnSeqtaTabs(): Promise<boolean> {
  const tabs = await browser.tabs.query({});
  let delivered = false;
  for (const tab of tabs) {
    if (tab.id == null || !isSeqtaTab(tab)) continue;
    try {
      await browser.tabs.sendMessage(tab.id, { type: "calendarRunWeeklySync" });
      delivered = true;
    } catch {
      // Tab may not have content script yet.
    }
  }
  return delivered;
}

async function handleWeeklySyncAlarm(): Promise<void> {
  if (!(await isAnyCalendarConnected()) || !(await getAutoSyncWeekly())) return;
  if (!(await triggerWeeklySyncOnSeqtaTabs())) await markWeeklySyncPending();
}

export function initCalendarBackground(): void {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === CALENDAR_WEEKLY_ALARM) void handleWeeklySyncAlarm();
  });
  void ensureWeeklySyncAlarm();
}
