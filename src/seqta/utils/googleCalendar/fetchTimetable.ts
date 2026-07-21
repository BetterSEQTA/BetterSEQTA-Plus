import type { SyncDateRange } from "./syncDateRange";
import { syncWindowRange } from "./syncDateRange";
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

export async function resolveStudentId(): Promise<number | undefined> {
  try {
    const json = await postSeqtaJson<{ payload?: { id?: number; student?: number } }>(
      "/seqta/student/login",
      { mode: "normal", query: null, redirect_url: location.origin },
    );
    const id = json?.payload?.id ?? json?.payload?.student;
    return typeof id === "number" && Number.isFinite(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

function isEngageParentContext(): boolean {
  return (
    location.pathname.includes("/parent/") ||
    location.hash.includes("/parent/") ||
    document.body.classList.contains("parent")
  );
}

export async function fetchTimetableLessons(
  range: SyncDateRange,
): Promise<SeqtaTimetableLesson[]> {
  const { from, until } = range;
  const coloursPromise = fetchSubjectColours();

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

  return withSubjectColours(lessons, await coloursPromise);
}

export async function fetchTimetableForSync(weeksAhead?: number): Promise<SeqtaTimetableLesson[]> {
  return fetchTimetableLessons(syncWindowRange(weeksAhead));
}
