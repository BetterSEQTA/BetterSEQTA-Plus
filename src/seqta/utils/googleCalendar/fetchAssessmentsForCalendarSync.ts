import {
  shouldSyncAssessment,
  type CalendarSyncAssessment,
} from "@/seqta/utils/googleCalendar/assessmentEventMapper";
import { resolveStudentId } from "@/seqta/utils/googleCalendar/fetchTimetable";
import { isDateInRange, type SyncDateRange } from "@/seqta/utils/googleCalendar/syncDateRange";
import { toISODate } from "@/seqta/utils/Loaders/engageParentTimetable";

async function postSeqtaJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${location.origin}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Requested-With": "XMLHttpRequest",
      Accept: "text/javascript, text/html, application/xml, text/xml, */*",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`SEQTA request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

function isEngageParentContext(): boolean {
  return (
    location.pathname.includes("/parent/") ||
    location.hash.includes("/parent/") ||
    document.body.classList.contains("parent")
  );
}

function normalizeDue(raw: Record<string, unknown>): string {
  const due = raw.due ?? raw.date ?? raw.dueDate;
  return typeof due === "string" ? due : String(due ?? "");
}

function parseAssessmentRow(raw: unknown): CalendarSyncAssessment | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = Number(row.id);
  const title = String(row.title ?? "").trim();
  const due = normalizeDue(row);
  if (!id || !title || !due) return null;

  return {
    id,
    title,
    subject: String(row.subject ?? row.code ?? "").trim(),
    code: String(row.code ?? row.subject ?? "").trim(),
    due,
    status: row.status != null ? String(row.status) : undefined,
  };
}

function dueDateInRange(due: string, range: SyncDateRange): boolean {
  const trimmed = due.trim();
  let datePart = trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return false;
    datePart = toISODate(parsed);
  }
  return isDateInRange(datePart, range);
}

async function fetchUpcomingAssessments(studentId: number): Promise<CalendarSyncAssessment[]> {
  const path = isEngageParentContext()
    ? "/seqta/parent/assessment/list/upcoming?"
    : "/seqta/student/assessment/list/upcoming?";
  const data = await postSeqtaJson<{ payload?: unknown[] }>(path, { student: studentId });
  const payload = Array.isArray(data.payload) ? data.payload : [];
  const out: CalendarSyncAssessment[] = [];
  for (const raw of payload) {
    const parsed = parseAssessmentRow(raw);
    if (parsed) out.push(parsed);
  }
  return out;
}

/** Upcoming assessments with due dates inside the sync window. */
export async function fetchAssessmentsForCalendarSync(
  range: SyncDateRange,
): Promise<CalendarSyncAssessment[]> {
  try {
    const studentId = await resolveStudentId();
    if (studentId == null) return [];

    const upcoming = await fetchUpcomingAssessments(studentId);
    return upcoming.filter(
      (a) => shouldSyncAssessment(a) && dueDateInRange(a.due, range),
    );
  } catch (err) {
    console.warn("[BetterSEQTA+] Assessment calendar fetch failed:", err);
    return [];
  }
}
