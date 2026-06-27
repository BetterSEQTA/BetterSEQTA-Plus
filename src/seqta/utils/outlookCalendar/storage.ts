import browser from "webextension-polyfill";
import type { GoogleCalendarEventMapEntry } from "@/seqta/utils/googleCalendar/eventMapEntry";

export const BSPLUS_OUTLOOK_CALENDAR_STORAGE_KEY = "bsplus_outlook_calendar";

export interface OutlookCalendarStoredState {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  connectedAt?: number;
  lastSyncAt?: number;
  lastSyncOrigin?: string;
  eventMap?: Record<string, string | GoogleCalendarEventMapEntry>;
}

export async function readOutlookCalendarState(): Promise<OutlookCalendarStoredState> {
  const got = await browser.storage.local.get(BSPLUS_OUTLOOK_CALENDAR_STORAGE_KEY);
  const raw = got[BSPLUS_OUTLOOK_CALENDAR_STORAGE_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as OutlookCalendarStoredState;
}

export async function writeOutlookCalendarState(
  patch: Partial<OutlookCalendarStoredState>,
): Promise<OutlookCalendarStoredState> {
  const current = await readOutlookCalendarState();
  const next: OutlookCalendarStoredState = { ...current, ...patch };
  await browser.storage.local.set({ [BSPLUS_OUTLOOK_CALENDAR_STORAGE_KEY]: next });
  return next;
}

export async function clearOutlookCalendarState(): Promise<void> {
  await browser.storage.local.remove(BSPLUS_OUTLOOK_CALENDAR_STORAGE_KEY);
}

export function outlookEventMapKey(origin: string, seqtaKey: string): string {
  return `${origin}::${seqtaKey}`;
}
