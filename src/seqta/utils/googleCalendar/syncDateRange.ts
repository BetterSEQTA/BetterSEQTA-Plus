import { GOOGLE_CALENDAR_SYNC_WEEKS } from "@/config/googleCalendar";
import { toISODate, weekRangeContaining } from "@/seqta/utils/Loaders/engageParentTimetable";

export interface SyncDateRange {
  from: string;
  until: string;
}

function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

function weekEndingOn(until: string): SyncDateRange {
  const end = parseLocalDate(until);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { from: toISODate(start), until };
}

/** Full rolling sync window from the start of the current week. */
export function syncWindowRange(weeksAhead = GOOGLE_CALENDAR_SYNC_WEEKS): SyncDateRange {
  const { from } = weekRangeContaining(new Date());
  const end = parseLocalDate(from);
  end.setDate(end.getDate() + weeksAhead * 7 - 1);
  return { from, until: toISODate(end) };
}

/** The trailing week at the end of the sync window (added each weekly roll). */
export function trailingWeekRange(weeksAhead = GOOGLE_CALENDAR_SYNC_WEEKS): SyncDateRange {
  return weekEndingOn(syncWindowRange(weeksAhead).until);
}

/** The week that rolled off when the window advances (removed each weekly roll). */
export function droppedWeekRange(weeksAhead = GOOGLE_CALENDAR_SYNC_WEEKS): SyncDateRange {
  const end = parseLocalDate(syncWindowRange(weeksAhead).from);
  end.setDate(end.getDate() - 1);
  return weekEndingOn(toISODate(end));
}

export function isDateInRange(date: string, range: SyncDateRange): boolean {
  return date >= range.from && date <= range.until;
}

/** Wide range used when removing all synced events (covers past + future terms). */
export function wideCleanupRange(years = 3): SyncDateRange {
  const now = new Date();
  const from = new Date(now);
  from.setFullYear(from.getFullYear() - years);
  const until = new Date(now);
  until.setFullYear(until.getFullYear() + years);
  return { from: toISODate(from), until: toISODate(until) };
}
