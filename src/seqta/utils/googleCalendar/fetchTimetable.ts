import { toISODate } from "@/seqta/utils/Loaders/engageParentTimetable";
import type { CalendarSyncAssessment } from "./eventMapper";
import type { SyncDateRange } from "./syncDateRange";
import { isDateInRange, syncWindowRange } from "./syncDateRange";
import type { SeqtaTimetableLesson } from "./types";

type PrefItem = { name?: string; value?: string };

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

function prefsToSubjectColours(prefs: PrefItem[] | undefined): Record<string, string> {
  const colours: Record<string, string> = {};
  for (const pref of prefs ?? []) {
    if (!pref.name?.startsWith("timetable.subject.colour.") || !pref.value) continue;
    const code = pref.name.slice("timetable.subject.colour.".length);
    if (code) colours[code] = pref.value;
  }
  return colours;
}

async function fetchSubjectColours(): Promise<Record<string, string>> {
  try {
    if (isEngageParentContext()) {
      const data = await postSeqtaJson<{ payload?: PrefItem[] }>("/seqta/parent/load/prefs?", {
        request: "userPrefs",
        asArray: true,
      });
      return prefsToSubjectColours(data?.payload);
    }

    const studentId = await resolveStudentId();
    const body: Record<string, unknown> = {
      request: "userPrefs",
      asArray: true,
    };
    if (studentId != null) body.user = studentId;

    const data = await postSeqtaJson<{ payload?: PrefItem[] }>("/seqta/student/load/prefs?", body);
    return prefsToSubjectColours(data?.payload);
  } catch {
    return {};
  }
}

function withSubjectColours(
  lessons: SeqtaTimetableLesson[],
  colours: Record<string, string>,
): SeqtaTimetableLesson[] {
  if (Object.keys(colours).length === 0) return lessons;
  return lessons.map((lesson) => {
    const code = lesson.code?.trim();
    if (!code) return lesson;
    const colour = colours[code];
    if (!colour) return lesson;
    return { ...lesson, colour };
  });
}

type SeqtaLoginPayload = {
  id?: number;
  student?: number;
  type?: string;
};

let cachedLogin: SeqtaLoginPayload | null = null;

async function resolveLoginPayload(): Promise<SeqtaLoginPayload | undefined> {
  if (cachedLogin?.id != null) return cachedLogin;
  try {
    const json = await postSeqtaJson<{ payload?: SeqtaLoginPayload }>(
      "/seqta/student/login",
      { mode: "normal", query: null, redirect_url: location.href },
    );
    const payload = json?.payload;
    if (!payload) return undefined;
    cachedLogin = payload;
    return payload;
  } catch {
    return undefined;
  }
}

export async function resolveStudentId(): Promise<number | undefined> {
  const payload = await resolveLoginPayload();
  const id = payload?.id ?? payload?.student;
  return typeof id === "number" && Number.isFinite(id) ? id : undefined;
}

async function resolvePersonType(): Promise<string> {
  const payload = await resolveLoginPayload();
  const type = payload?.type?.trim().toLowerCase();
  return type || "student";
}

function isEngageParentContext(): boolean {
  return (
    location.pathname.includes("/parent/") ||
    location.hash.includes("/parent/") ||
    document.body.classList.contains("parent")
  );
}

type SeqtaAppointmentPayload = {
  id?: number;
  from?: string;
  until?: string;
  event?: {
    id?: number;
    title?: string;
    notes?: string;
    colour?: string;
    event_type?: string;
  };
};

/** Parse SEQTA datetimes like `2026-07-20 09:30:00.0` into lesson date/time fields. */
export function parseSeqtaDateTime(value: string | undefined): { date: string; time: string } | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}:\d{2})/);
  if (!match) return null;
  return { date: match[1], time: match[2] };
}

export function appointmentToLesson(item: SeqtaAppointmentPayload): SeqtaTimetableLesson | null {
  const start = parseSeqtaDateTime(item.from);
  const end = parseSeqtaDateTime(item.until);
  const title = item.event?.title?.trim();
  const eventId = item.event?.id ?? item.id;
  if (!start || !end || !title || eventId == null) return null;

  const notes = item.event?.notes?.trim();
  return {
    date: start.date,
    from: start.time,
    until: end.time,
    description: title,
    type: item.event?.event_type?.trim() || "appointment",
    calendarid: `event:${eventId}`,
    colour: item.event?.colour?.trim() || undefined,
    ...(notes ? { notes } : {}),
  };
}

export async function fetchAppointments(range: SyncDateRange): Promise<SeqtaTimetableLesson[]> {
  if (isEngageParentContext()) return [];

  try {
    const person = await resolveStudentId();
    if (person == null) return [];

    const personType = await resolvePersonType();
    const data = await postSeqtaJson<{ payload?: SeqtaAppointmentPayload[] }>(
      "/seqta/student/events/load",
      {
        dateFrom: range.from,
        dateTo: range.until,
        person,
        personType,
      },
    );

    const payload = Array.isArray(data?.payload) ? data.payload : [];
    const lessons: SeqtaTimetableLesson[] = [];
    for (const item of payload) {
      const lesson = appointmentToLesson(item);
      if (lesson) lessons.push(lesson);
    }
    return lessons;
  } catch {
    return [];
  }
}

export async function fetchTimetableLessons(
  range: SyncDateRange,
): Promise<SeqtaTimetableLesson[]> {
  const { from, until } = range;
  const coloursPromise = fetchSubjectColours();
  const appointmentsPromise = fetchAppointments(range);

  let lessons: SeqtaTimetableLesson[] = [];

  if (isEngageParentContext()) {
    const listJson = await postSeqtaJson<{ payload?: { id?: string | number }[] }>(
      "/seqta/parent/load/timetable",
      { list: true },
    );
    const firstChild = Array.isArray(listJson?.payload) ? listJson.payload[0] : undefined;
    const studentId = firstChild?.id;
    if (studentId == null) {
      throw new Error("No student found on this parent account.");
    }
    const data = await postSeqtaJson<{ payload?: { items?: SeqtaTimetableLesson[] } }>(
      "/seqta/parent/load/timetable",
      { from, until, student: studentId },
    );
    lessons = Array.isArray(data?.payload?.items) ? data.payload.items : [];
  } else {
    const studentId = await resolveStudentId();
    const body: Record<string, unknown> = { from, until };
    if (studentId != null) body.student = studentId;

    const data = await postSeqtaJson<{ payload?: { items?: SeqtaTimetableLesson[] } }>(
      "/seqta/student/load/timetable?",
      body,
    );
    lessons = Array.isArray(data?.payload?.items) ? data.payload.items : [];
  }

  const coloured = withSubjectColours(lessons, await coloursPromise);
  const appointments = await appointmentsPromise;
  return [...coloured, ...appointments];
}

export async function fetchTimetableForSync(weeksAhead?: number): Promise<SeqtaTimetableLesson[]> {
  return fetchTimetableLessons(syncWindowRange(weeksAhead));
}

function parseAssessmentDue(raw: Record<string, unknown>): string {
  const due = raw.due ?? raw.date ?? raw.dueDate;
  return typeof due === "string" ? due : String(due ?? "");
}

function assessmentDueInRange(due: string, range: SyncDateRange): boolean {
  const trimmed = due.trim();
  let datePart = trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return false;
    datePart = toISODate(parsed);
  }
  return isDateInRange(datePart, range);
}

/** Upcoming assessments with due dates inside the sync window. */
export async function fetchAssessmentsForCalendarSync(
  range: SyncDateRange,
): Promise<CalendarSyncAssessment[]> {
  try {
    const studentId = await resolveStudentId();
    if (studentId == null) return [];

    const path = isEngageParentContext()
      ? "/seqta/parent/assessment/list/upcoming?"
      : "/seqta/student/assessment/list/upcoming?";
    const data = await postSeqtaJson<{ payload?: unknown[] }>(path, { student: studentId });
    const payload = Array.isArray(data.payload) ? data.payload : [];

    const out: CalendarSyncAssessment[] = [];
    for (const raw of payload) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      const id = Number(row.id);
      const title = String(row.title ?? "").trim();
      const due = parseAssessmentDue(row);
      if (!id || !title || !due || !assessmentDueInRange(due, range)) continue;
      if (row.status === "MARKS_RELEASED" || row.status === "CANCELLED") continue;
      out.push({
        id,
        title,
        subject: String(row.subject ?? row.code ?? "").trim(),
        code: String(row.code ?? row.subject ?? "").trim(),
        due,
        status: row.status != null ? String(row.status) : undefined,
      });
    }
    return out;
  } catch (err) {
    console.warn("[BetterSEQTA+] Assessment calendar fetch failed:", err);
    return [];
  }
}
