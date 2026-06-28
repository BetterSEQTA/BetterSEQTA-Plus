/** Outlook Calendar OAuth — public client config. Token exchange is on accounts.betterseqta.org. */

import { ACCOUNTS_BASE } from "@/config/googleCalendar";

const HARDCODED_OUTLOOK_OAUTH_CLIENT_ID = "0b55168c-916c-4323-8f67-b3dd30af3c9e";

const envClientId =
  typeof __OUTLOOK_OAUTH_CLIENT_ID__ !== "undefined" ? __OUTLOOK_OAUTH_CLIENT_ID__ : "";

export const OUTLOOK_OAUTH_CLIENT_ID: string =
  envClientId.trim() || HARDCODED_OUTLOOK_OAUTH_CLIENT_ID.trim();

export const OUTLOOK_CALENDAR_OAUTH_CALLBACK = `${ACCOUNTS_BASE}/auth/microsoft/calendar/callback`;
export const OUTLOOK_CALENDAR_TOKEN_URL = `${ACCOUNTS_BASE}/api/bsplus/microsoft/calendar/token`;
export const OUTLOOK_CALENDAR_REFRESH_URL = `${ACCOUNTS_BASE}/api/bsplus/microsoft/calendar/refresh`;

export const OUTLOOK_CALENDAR_SCOPE = "offline_access Calendars.ReadWrite User.Read";

export const OUTLOOK_AUTH_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";

export const OUTLOOK_GRAPH_API = "https://graph.microsoft.com/v1.0";

export const BSPLUS_OUTLOOK_CALENDAR_EVENT_CATEGORY = "BetterSEQTA+";

export function isOutlookCalendarConfigured(): boolean {
  return OUTLOOK_OAUTH_CLIENT_ID.length > 0;
}

export const OUTLOOK_CALENDAR_ACCOUNTS_NOT_READY_HINT =
  "Outlook Calendar connect requires accounts.betterseqta.org — see docs/OUTLOOK_CALENDAR_ACCOUNTS_CALLBACK.md";

export function outlookOAuthRedirectUriHint(): string {
  return `Authorized redirect URI in Azure must be: ${OUTLOOK_CALENDAR_OAUTH_CALLBACK}`;
}
