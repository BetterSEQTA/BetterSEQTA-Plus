import { describe, expect, it } from "@jest/globals";
import {
  lessonToGoogleEvent,
  mapLessonsToGoogleEvents,
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
