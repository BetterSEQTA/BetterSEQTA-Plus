import { syncWindowRange } from "@/seqta/utils/googleCalendar/syncDateRange";
import { classRefsFromTimetableItems, classRosterKey, type ClassRef } from "./classKeys";
import { CLASSMATES_SCHOOL_YEAR_WEEKS } from "./constants";
import { fetchStudentTimetableItems } from "./seqtaClient";

export type EnrollmentSnapshot = {
  period: { from: string; until: string };
  classes: ClassRef[];
  ciToClassKey: Record<string, string>;
};

/** Stable hash for “did my enrollments change?” checks. */
export function fingerprintEnrollment(snapshot: Pick<EnrollmentSnapshot, "classes" | "ciToClassKey">): string {
  const classKeys = snapshot.classes
    .map((c) => classRosterKey(c))
    .filter((k): k is string => Boolean(k))
    .sort();
  const ciPairs = Object.entries(snapshot.ciToClassKey).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify({ classKeys, ciPairs });
}

/** Rolling school-year window from the start of the current week. */
export async function fetchSchoolYearEnrollmentSnapshot(): Promise<EnrollmentSnapshot> {
  const period = syncWindowRange(CLASSMATES_SCHOOL_YEAR_WEEKS);
  const items = await fetchStudentTimetableItems(period.from, period.until);
  const classes = classRefsFromTimetableItems(items);
  const ciToClassKey: Record<string, string> = {};
  for (const item of items) {
    if (item.ci == null) continue;
    const key = classRosterKey(item);
    if (key) ciToClassKey[String(item.ci)] = key;
  }
  return { period, classes, ciToClassKey };
}
