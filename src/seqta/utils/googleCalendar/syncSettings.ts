import {
  GOOGLE_CALENDAR_SYNC_WEEKS_DEFAULT,
  GOOGLE_CALENDAR_SYNC_WEEKS_MAX,
  GOOGLE_CALENDAR_SYNC_WEEKS_MIN,
} from "@/config/googleCalendar";
import { readGoogleCalendarState, writeGoogleCalendarState } from "./storage";

export const GOOGLE_CALENDAR_WEEKLY_ALARM = "bsplus_google_calendar_weekly";
export const WEEKLY_SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export function clampSyncWeeks(weeks: number): number {
  if (!Number.isFinite(weeks)) return GOOGLE_CALENDAR_SYNC_WEEKS_DEFAULT;
  return Math.min(
    GOOGLE_CALENDAR_SYNC_WEEKS_MAX,
    Math.max(GOOGLE_CALENDAR_SYNC_WEEKS_MIN, Math.round(weeks)),
  );
}

export async function getSyncWeeksAhead(): Promise<number> {
  const state = await readGoogleCalendarState();
  return clampSyncWeeks(state.syncWeeksAhead ?? GOOGLE_CALENDAR_SYNC_WEEKS_DEFAULT);
}

export async function setSyncWeeksAhead(weeks: number): Promise<number> {
  const syncWeeksAhead = clampSyncWeeks(weeks);
  await writeGoogleCalendarState({ syncWeeksAhead });
  return syncWeeksAhead;
}

export async function getAutoSyncWeekly(): Promise<boolean> {
  const state = await readGoogleCalendarState();
  return state.autoSyncWeekly !== false;
}

export async function setAutoSyncWeekly(enabled: boolean): Promise<void> {
  await writeGoogleCalendarState({ autoSyncWeekly: enabled });
}

export async function shouldRunWeeklySync(): Promise<boolean> {
  const state = await readGoogleCalendarState();
  if (!state.refreshToken && !state.accessToken) return false;
  if (state.autoSyncWeekly === false) return false;
  if (state.pendingWeeklySync) return true;
  const last = state.lastWeeklySyncAt ?? state.lastSyncAt ?? 0;
  return Date.now() - last >= WEEKLY_SYNC_INTERVAL_MS;
}

export async function markWeeklySyncComplete(): Promise<void> {
  await writeGoogleCalendarState({
    lastWeeklySyncAt: Date.now(),
    pendingWeeklySync: false,
  });
}

export async function markWeeklySyncPending(): Promise<void> {
  await writeGoogleCalendarState({ pendingWeeklySync: true });
}
