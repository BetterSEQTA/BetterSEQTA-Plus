/**
 * Google Calendar OAuth — public client config (extension).
 * Client secret and token exchange live on accounts.betterseqta.org.
 * See docs/GOOGLE_CALENDAR_ACCOUNTS_CALLBACK.md
 */

const HARDCODED_GOOGLE_OAUTH_CLIENT_ID =
  "270834969641-f6t7jtpu6j0cemse8updj3rkos7nl0hf.apps.googleusercontent.com";

const envClientId =
  typeof __GOOGLE_OAUTH_CLIENT_ID__ !== "undefined" ? __GOOGLE_OAUTH_CLIENT_ID__ : "";

export const GOOGLE_OAUTH_CLIENT_ID: string =
  envClientId.trim() || HARDCODED_GOOGLE_OAUTH_CLIENT_ID.trim();

export const ACCOUNTS_BASE = "https://accounts.betterseqta.org";

/** Must match Google Console + accounts callback route exactly. */
export const GOOGLE_CALENDAR_OAUTH_CALLBACK = `${ACCOUNTS_BASE}/auth/google/calendar/callback`;

export const GOOGLE_CALENDAR_TOKEN_URL = `${ACCOUNTS_BASE}/api/bsplus/google/calendar/token`;
export const GOOGLE_CALENDAR_REFRESH_URL = `${ACCOUNTS_BASE}/api/bsplus/google/calendar/refresh`;

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export const BSPLUS_GOOGLE_CALENDAR_EVENT_PROP = "bsplusSeqtaKey";

/** Weeks of timetable to sync (from start of current week). */
export const GOOGLE_CALENDAR_SYNC_WEEKS = 12;

export function isGoogleCalendarConfigured(): boolean {
  return GOOGLE_OAUTH_CLIENT_ID.length > 0;
}

export const GOOGLE_CALENDAR_ACCOUNTS_NOT_READY_HINT =
  "Google Calendar connect requires accounts.betterseqta.org — see docs/GOOGLE_CALENDAR_ACCOUNTS_CALLBACK.md";

export function googleOAuthRedirectUriHint(): string {
  return `Authorized redirect URI in Google Cloud Console must be: ${GOOGLE_CALENDAR_OAUTH_CALLBACK}`;
}
