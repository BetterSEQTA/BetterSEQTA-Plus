import {
  GOOGLE_CALENDAR_SYNC_WEEKS_DEFAULT,
} from "@/config/googleCalendar";
import { toISODate, weekRangeContaining } from "@/seqta/utils/Loaders/engageParentTimetable";

export interface SyncDateRange {
  from: string;
  until: string;
}

function parseLocalDate(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

/** Full rolling sync window from the start of the current week. */
export function syncWindowRange(weeksAhead = GOOGLE_CALENDAR_SYNC_WEEKS_DEFAULT): SyncDateRange {
  const { from } = weekRangeContaining(new Date());
  const end = parseLocalDate(from);
  end.setDate(end.getDate() + weeksAhead * 7 - 1);
  return { from, until: toISODate(end) };
}

/** The trailing week at the end of the sync window (added each weekly roll). */
export function trailingWeekRange(weeksAhead = GOOGLE_CALENDAR_SYNC_WEEKS_DEFAULT): SyncDateRange {
  const { from: windowStart } = syncWindowRange(weeksAhead);
  const start = parseLocalDate(windowStart);
  start.setDate(start.getDate() + (weeksAhead - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: toISODate(start), until: toISODate(end) };
}

/** The week that rolled off when the window advances (removed each weekly roll). */
export function droppedWeekRange(weeksAhead = GOOGLE_CALENDAR_SYNC_WEEKS_DEFAULT): SyncDateRange {
  const { from: windowStart } = syncWindowRange(weeksAhead);
  const end = parseLocalDate(windowStart);
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { from: toISODate(start), until: toISODate(end) };
}

export function isDateInRange(date: string, range: SyncDateRange): boolean {
  return date >= range.from && date <= range.until;
}
