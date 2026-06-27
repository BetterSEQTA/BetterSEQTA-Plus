import { BSPLUS_OUTLOOK_CALENDAR_EVENT_CATEGORY } from "@/config/outlookCalendar";
import type {
  GoogleCalendarEventInput,
  SeqtaTimetableLesson,
} from "@/seqta/utils/googleCalendar/types";
import {
  lessonToGoogleEvent,
  mapLessonsToGoogleEvents,
} from "@/seqta/utils/googleCalendar/eventMapper";

export { mapLessonsToGoogleEvents, lessonToGoogleEvent, seqtaLessonKey } from "@/seqta/utils/googleCalendar/eventMapper";

export function outlookGraphEventBody(event: GoogleCalendarEventInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    subject: event.summary,
    body: {
      contentType: "text",
      content: event.description ?? "Synced by BetterSEQTA+",
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

export function mapLessonsToOutlookEvents(
  origin: string,
  lessons: SeqtaTimetableLesson[],
  timeZone: string,
): GoogleCalendarEventInput[] {
  return mapLessonsToGoogleEvents(origin, lessons, timeZone);
}
