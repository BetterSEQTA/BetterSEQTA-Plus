import { GOOGLE_CALENDAR_SYNC_WEEKS } from "@/config/googleCalendar";
import { toISODate, weekRangeContaining } from "@/seqta/utils/Loaders/engageParentTimetable";
import type { SeqtaTimetableLesson } from "./types";

export function syncDateRange(weeksAhead = GOOGLE_CALENDAR_SYNC_WEEKS): {
  from: string;
  until: string;
} {
  const { from } = weekRangeContaining(new Date());
  const end = new Date(from + "T12:00:00");
  end.setDate(end.getDate() + weeksAhead * 7 - 1);
  return { from, until: toISODate(end) };
}

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

export async function fetchTimetableForSync(): Promise<SeqtaTimetableLesson[]> {
  const { from, until } = syncDateRange();

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
    return Array.isArray(data?.payload?.items) ? data.payload.items : [];
  }

  const studentId = await resolveStudentId();
  const body: Record<string, unknown> = { from, until };
  if (studentId != null) body.student = studentId;

  const data = await postSeqtaJson<{ payload?: { items?: SeqtaTimetableLesson[] } }>(
    "/seqta/student/load/timetable?",
    body,
  );
  return Array.isArray(data?.payload?.items) ? data.payload.items : [];
}
