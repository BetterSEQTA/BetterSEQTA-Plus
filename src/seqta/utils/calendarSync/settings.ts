import {
  GOOGLE_CALENDAR_SYNC_WEEKS_DEFAULT,
  GOOGLE_CALENDAR_SYNC_WEEKS_MAX,
  GOOGLE_CALENDAR_SYNC_WEEKS_MIN,
} from "@/config/googleCalendar";
import { readOutlookCalendarState } from "@/seqta/utils/outlookCalendar/storage";
import { readGoogleCalendarState } from "@/seqta/utils/googleCalendar/storage";
import {
  readSharedCalendarSyncSettings,
  WEEKLY_SYNC_INTERVAL_MS,
  writeSharedCalendarSyncSettings,
} from "./sharedSettings";

export { CALENDAR_WEEKLY_ALARM, WEEKLY_SYNC_INTERVAL_MS } from "./sharedSettings";

export function clampSyncWeeks(weeks: number): number {
  if (!Number.isFinite(weeks)) return GOOGLE_CALENDAR_SYNC_WEEKS_DEFAULT;
  return Math.min(
    GOOGLE_CALENDAR_SYNC_WEEKS_MAX,
    Math.max(GOOGLE_CALENDAR_SYNC_WEEKS_MIN, Math.round(weeks)),
  );
}

export async function getSyncWeeksAhead(): Promise<number> {
  const settings = await readSharedCalendarSyncSettings();
  return clampSyncWeeks(settings.syncWeeksAhead ?? GOOGLE_CALENDAR_SYNC_WEEKS_DEFAULT);
}

export async function getAutoSyncWeekly(): Promise<boolean> {
  const settings = await readSharedCalendarSyncSettings();
  return settings.autoSyncWeekly !== false;
}

async function isAnyCalendarConnected(): Promise<boolean> {
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
