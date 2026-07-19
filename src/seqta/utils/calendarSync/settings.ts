import browser from "webextension-polyfill";
import {
  GOOGLE_CALENDAR_SYNC_WEEKS,
  GOOGLE_CALENDAR_SYNC_WEEKS_MAX,
  GOOGLE_CALENDAR_SYNC_WEEKS_MIN,
} from "@/config/googleCalendar";
import {
  readGoogleCalendarState,
  readOutlookCalendarState,
} from "@/seqta/utils/calendarSync/providerStorage";

export const BSPLUS_CALENDAR_SYNC_SETTINGS_KEY = "bsplus_calendar_sync_settings";
export const CALENDAR_WEEKLY_ALARM = "bsplus_calendar_weekly";
export const WEEKLY_SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SharedCalendarSyncSettings {
  syncWeeksAhead?: number;
  autoSyncWeekly?: boolean;
  lastWeeklySyncAt?: number;
  pendingWeeklySync?: boolean;
}

export async function readSharedCalendarSyncSettings(): Promise<SharedCalendarSyncSettings> {
  const got = await browser.storage.local.get(BSPLUS_CALENDAR_SYNC_SETTINGS_KEY);
  const raw = got[BSPLUS_CALENDAR_SYNC_SETTINGS_KEY];
  const shared =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as SharedCalendarSyncSettings)
      : {};

  if (Object.keys(shared).length > 0) return shared;

  const legacy = await readGoogleCalendarState();
  return {
    syncWeeksAhead: legacy.syncWeeksAhead,
    autoSyncWeekly: legacy.autoSyncWeekly,
    lastWeeklySyncAt: legacy.lastWeeklySyncAt,
    pendingWeeklySync: legacy.pendingWeeklySync,
  };
}

export async function writeSharedCalendarSyncSettings(
  patch: Partial<SharedCalendarSyncSettings>,
): Promise<SharedCalendarSyncSettings> {
  const current = await readSharedCalendarSyncSettings();
  const next = { ...current, ...patch };
  await browser.storage.local.set({ [BSPLUS_CALENDAR_SYNC_SETTINGS_KEY]: next });
  return next;
}

export function clampSyncWeeks(weeks: number): number {
  if (!Number.isFinite(weeks)) return GOOGLE_CALENDAR_SYNC_WEEKS;
  return Math.min(
    GOOGLE_CALENDAR_SYNC_WEEKS_MAX,
    Math.max(GOOGLE_CALENDAR_SYNC_WEEKS_MIN, Math.round(weeks)),
  );
}

export async function getSyncWeeksAhead(): Promise<number> {
  const settings = await readSharedCalendarSyncSettings();
  return clampSyncWeeks(settings.syncWeeksAhead ?? GOOGLE_CALENDAR_SYNC_WEEKS);
}

export async function getAutoSyncWeekly(): Promise<boolean> {
  const settings = await readSharedCalendarSyncSettings();
  return settings.autoSyncWeekly !== false;
}

export async function isAnyCalendarConnected(): Promise<boolean> {
  const [google, outlook] = await Promise.all([
    readGoogleCalendarState(),
    readOutlookCalendarState(),
  ]);
  return !!(
    google.refreshToken ||
    google.accessToken ||
    outlook.refreshToken ||
    outlook.accessToken
  );
}

export async function shouldRunWeeklySync(): Promise<boolean> {
  const settings = await readSharedCalendarSyncSettings();
  if (settings.autoSyncWeekly === false) return false;
  if (!(await isAnyCalendarConnected())) return false;
  if (settings.pendingWeeklySync) return true;
  const last = settings.lastWeeklySyncAt ?? 0;
  return Date.now() - last >= WEEKLY_SYNC_INTERVAL_MS;
}

export async function markWeeklySyncComplete(): Promise<void> {
  await writeSharedCalendarSyncSettings({
    lastWeeklySyncAt: Date.now(),
    pendingWeeklySync: false,
  });
}

export async function markWeeklySyncPending(): Promise<void> {
  await writeSharedCalendarSyncSettings({ pendingWeeklySync: true });
}
