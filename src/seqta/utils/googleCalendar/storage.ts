import browser from "webextension-polyfill";

/** Never uploaded to BetterSEQTA Cloud (OAuth tokens + per-device event map). */
export const BSPLUS_GOOGLE_CALENDAR_STORAGE_KEY = "bsplus_google_calendar";

export interface GoogleCalendarStoredState {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  connectedAt?: number;
  lastSyncAt?: number;
  lastSyncOrigin?: string;
  /** `${origin}::${seqtaKey}` → Google Calendar event id */
  eventMap?: Record<string, string>;
}

export async function readGoogleCalendarState(): Promise<GoogleCalendarStoredState> {
  const got = await browser.storage.local.get(BSPLUS_GOOGLE_CALENDAR_STORAGE_KEY);
  const raw = got[BSPLUS_GOOGLE_CALENDAR_STORAGE_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as GoogleCalendarStoredState;
}

export async function writeGoogleCalendarState(
  patch: Partial<GoogleCalendarStoredState>,
): Promise<GoogleCalendarStoredState> {
  const current = await readGoogleCalendarState();
  const next: GoogleCalendarStoredState = { ...current, ...patch };
  await browser.storage.local.set({ [BSPLUS_GOOGLE_CALENDAR_STORAGE_KEY]: next });
  return next;
}

export async function clearGoogleCalendarState(): Promise<void> {
  await browser.storage.local.remove(BSPLUS_GOOGLE_CALENDAR_STORAGE_KEY);
}

export function eventMapKey(origin: string, seqtaKey: string): string {
  return `${origin}::${seqtaKey}`;
}
