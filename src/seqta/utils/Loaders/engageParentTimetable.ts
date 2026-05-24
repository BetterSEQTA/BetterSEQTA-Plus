const TIMETABLE_URL = "/seqta/parent/load/timetable";

export interface EngageParentChild {
  name: string;
  id: string;
}

export interface EngageParentTimetableItem {
  date: string;
  period: string;
  code: string;
  description: string;
  staff: string;
  type: string;
  room: string;
  from: string;
  until: string;
  programmeID?: number;
  metaID?: number;
  assessments?: unknown[];
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday–Sunday range (inclusive) containing `date`, as YYYY-MM-DD. */
export function weekRangeContaining(date: Date): { from: string; until: string } {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = local.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  local.setDate(local.getDate() + diff);
  const monday = local;
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return { from: toISODate(monday), until: toISODate(sunday) };
}

function isInWeekRange(
  isoDay: string,
  weekFrom: string,
  weekUntil: string,
): boolean {
  return isoDay >= weekFrom && isoDay <= weekUntil;
}

export function isDateInCachedWeek(
  date: Date,
  weekFrom: string,
  weekUntil: string,
): boolean {
  return isInWeekRange(toISODate(date), weekFrom, weekUntil);
}

async function postParentTimetable(body: object): Promise<any> {
  const res = await fetch(`${location.origin}${TIMETABLE_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function fetchEngageParentChildren(): Promise<EngageParentChild[]> {
  const data = await postParentTimetable({ list: true });
  const raw = data?.payload;
  if (!Array.isArray(raw)) return [];
  return raw.map((row: { name?: string; id?: string | number }) => ({
    name: String(row?.name ?? ""),
    id: String(row?.id ?? ""),
  }));
}

export async function fetchEngageParentTimetableWeek(
  from: string,
  until: string,
  studentId: string,
): Promise<EngageParentTimetableItem[]> {
  const student = /^\d+$/.test(studentId) ? Number(studentId) : studentId;
  const data = await postParentTimetable({ from, until, student });
  const items = data?.payload?.items;
  return Array.isArray(items) ? items : [];
}
