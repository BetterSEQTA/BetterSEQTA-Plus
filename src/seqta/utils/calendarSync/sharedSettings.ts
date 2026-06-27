import browser from "webextension-polyfill";
import {
  GOOGLE_CALENDAR_SYNC_WEEKS_DEFAULT,
} from "@/config/googleCalendar";
import { readGoogleCalendarState } from "@/seqta/utils/googleCalendar/storage";

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

export function defaultSyncWeeksAhead(): number {
  return GOOGLE_CALENDAR_SYNC_WEEKS_DEFAULT;
}
