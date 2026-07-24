import { describe, expect, it } from "@jest/globals";
import {
  googleApiEventBody,
  lessonToGoogleEvent,
  mapLessonsToGoogleEvents,
  outlookGraphEventBody,
  seqtaLessonKey,
  shouldSyncLesson,
} from "./eventMapper";
import type { SeqtaTimetableLesson } from "./types";

const ORIGIN = "https://school.seqta.com.au";

const baseLesson: SeqtaTimetableLesson = {
  date: "2026-06-27",
  from: "09:00:00",
  until: "10:00:00",
  description: "10 Mathematics",
  staff: "Mr Smith",
  room: "MA1",
  code: "10MAT",
  type: "class",
  calendarid: 12345,
};

describe("shouldSyncLesson", () => {
  it("accepts normal class rows", () => {
    expect(shouldSyncLesson(baseLesson)).toBe(true);
  });

  it("rejects holidays and rows without times", () => {
    expect(shouldSyncLesson({ ...baseLesson, type: "holiday" })).toBe(false);
    expect(shouldSyncLesson({ ...baseLesson, from: "" })).toBe(false);
  });
});

describe("seqtaLessonKey", () => {
  it("prefers calendarid when present", () => {
    expect(seqtaLessonKey(ORIGIN, baseLesson)).toBe(`${ORIGIN}:cal:12345`);
  });
});

describe("lessonToGoogleEvent", () => {
  it("maps SEQTA lesson fields to Google event input", () => {
    const event = lessonToGoogleEvent(ORIGIN, baseLesson, "Australia/Perth");
    expect(event).toMatchObject({
      summary: "10 Mathematics",
      location: "MA1",
      startDateTime: "2026-06-27T09:00:00",
      endDateTime: "2026-06-27T10:00:00",
      timeZone: "Australia/Perth",
    });
    expect(event?.description).toContain("Mr Smith");
  });

  it("maps subject colour to a Google colorId", () => {
    const event = lessonToGoogleEvent(
      ORIGIN,
      { ...baseLesson, colour: "#dc2127" },
      "Australia/Perth",
    );
    expect(event?.colorId).toBe("11");
  });

  it("maps appointments with notes", () => {
    const event = lessonToGoogleEvent(
      ORIGIN,
      {
        date: "2026-07-20",
        from: "09:30",
        until: "13:10",
        description: "Advisor meeting",
        type: "appointment",
        calendarid: "event:5",
        colour: "#ffc107",
        notes: "Bring forms",
      },
      "Australia/Perth",
    );
    expect(event).toMatchObject({
      summary: "Advisor meeting",
      startDateTime: "2026-07-20T09:30:00",
      endDateTime: "2026-07-20T13:10:00",
      seqtaKey: `${ORIGIN}:cal:event:5`,
    });
    expect(event?.description).toContain("Type: Appointment");
    expect(event?.description).toContain("Bring forms");
  });
});

describe("googleApiEventBody", () => {
  it("includes colorId when present", () => {
    const event = lessonToGoogleEvent(
      ORIGIN,
      { ...baseLesson, colour: "#dc2127" },
      "Australia/Perth",
    );
    expect(event).not.toBeNull();
    expect(googleApiEventBody(event!)).toMatchObject({ colorId: "11" });
  });
});

describe("mapLessonsToGoogleEvents", () => {
  it("deduplicates by seqta key", () => {
    const events = mapLessonsToGoogleEvents(
      ORIGIN,
      [baseLesson, { ...baseLesson }],
      "Australia/Perth",
    );
    expect(events).toHaveLength(1);
  });
});

describe("outlookGraphEventBody", () => {
  it("embeds Key: seqtaKey in the body for remote reconcile", () => {
    const event = lessonToGoogleEvent(ORIGIN, baseLesson, "Australia/Perth");
    expect(event).not.toBeNull();
    const body = outlookGraphEventBody(event!);
    const content = (body.body as { content: string }).content;
    expect(content).toContain(`Key: ${ORIGIN}:cal:12345`);
    expect(content).toContain("Synced by BetterSEQTA+");
  });
});
