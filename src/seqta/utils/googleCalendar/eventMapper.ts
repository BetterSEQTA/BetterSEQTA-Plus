import { BSPLUS_GOOGLE_CALENDAR_EVENT_PROP } from "@/config/googleCalendar";
import { BSPLUS_OUTLOOK_CALENDAR_EVENT_CATEGORY } from "@/config/outlookCalendar";
import { outlookDescriptionWithKey } from "@/seqta/utils/calendarSync/eventFingerprint";
import { nearestGoogleEventColorId } from "./eventColor";
import type { GoogleCalendarEventInput, SeqtaTimetableLesson } from "./types";

const SKIP_TYPES = new Set(["note", "holiday", "assembly-note"]);

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed.slice(0, 5);
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed;
  return trimmed;
}

export function seqtaLessonKey(origin: string, lesson: SeqtaTimetableLesson): string {
  if (lesson.calendarid != null && String(lesson.calendarid).length > 0) {
    return `${origin}:cal:${lesson.calendarid}`;
  }
  if (lesson.ci != null) {
    return `${origin}:ci:${lesson.ci}:${lesson.date}:${normalizeTime(lesson.from)}`;
  }
  return [
    origin,
    lesson.date,
    normalizeTime(lesson.from),
    lesson.code ?? "",
    lesson.description ?? "",
  ].join(":");
}

export function shouldSyncLesson(lesson: SeqtaTimetableLesson): boolean {
  if (!lesson.date || !lesson.from || !lesson.until) return false;
  if (lesson.type && SKIP_TYPES.has(lesson.type.toLowerCase())) return false;
  const title = (lesson.description ?? lesson.code ?? "").trim();
  if (!title) return false;
  return true;
}

export function lessonToGoogleEvent(
  origin: string,
  lesson: SeqtaTimetableLesson,
  timeZone: string,
): GoogleCalendarEventInput | null {
  if (!shouldSyncLesson(lesson)) return null;

  const from = normalizeTime(lesson.from);
  const until = normalizeTime(lesson.until);
  const summary = (lesson.description ?? lesson.code ?? "Class").trim();
  const staff = lesson.staff?.trim();
  const room = lesson.room?.trim();

  const isAppointment = (lesson.type ?? "").toLowerCase() === "appointment";
  const notes = lesson.notes?.trim();
  const descriptionLines = ["Synced by BetterSEQTA+"];
  if (isAppointment) {
    descriptionLines.push("Type: Appointment");
    if (notes) descriptionLines.push(`Notes: ${notes}`);
  } else {
    if (staff) descriptionLines.push(`Teacher: ${staff}`);
    if (lesson.code) descriptionLines.push(`Code: ${lesson.code}`);
    if (lesson.period) descriptionLines.push(`Period: ${lesson.period}`);
    if (notes) descriptionLines.push(`Notes: ${notes}`);
  }

  const colorId = nearestGoogleEventColorId(lesson.colour);

  return {
    seqtaKey: seqtaLessonKey(origin, lesson),
    summary,
    location: room || undefined,
    description: descriptionLines.join("\n"),
    startDateTime: `${lesson.date}T${from}:00`,
    endDateTime: `${lesson.date}T${until}:00`,
    timeZone,
    ...(colorId ? { colorId } : {}),
  };
}

export function mapLessonsToGoogleEvents(
  origin: string,
  lessons: SeqtaTimetableLesson[],
  timeZone: string,
): GoogleCalendarEventInput[] {
  const out: GoogleCalendarEventInput[] = [];
  const seen = new Set<string>();
  for (const lesson of lessons) {
    const mapped = lessonToGoogleEvent(origin, lesson, timeZone);
    if (!mapped || seen.has(mapped.seqtaKey)) continue;
    seen.add(mapped.seqtaKey);
    out.push(mapped);
  }
  return out;
}

export function googleApiEventBody(event: GoogleCalendarEventInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    summary: event.summary,
    location: event.location,
    description: event.description,
    start: { dateTime: event.startDateTime, timeZone: event.timeZone },
    end: { dateTime: event.endDateTime, timeZone: event.timeZone },
    extendedProperties: {
      private: {
        [BSPLUS_GOOGLE_CALENDAR_EVENT_PROP]: event.seqtaKey,
      },
    },
  };
  if (event.colorId) {
    body.colorId = event.colorId;
  }
  return body;
}

export function outlookGraphEventBody(event: GoogleCalendarEventInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    subject: event.summary,
    body: {
      contentType: "text",
      content: outlookDescriptionWithKey(event.description, event.seqtaKey),
    },
    start: { dateTime: event.startDateTime, timeZone: event.timeZone },
    end: { dateTime: event.endDateTime, timeZone: event.timeZone },
    categories: [BSPLUS_OUTLOOK_CALENDAR_EVENT_CATEGORY],
  };
  if (event.location) {
    body.location = { displayName: event.location };
  }
  return body;
}
