import { describe, expect, it } from "@jest/globals";
import {
  assessmentToGoogleEvent,
  mapAssessmentsToGoogleEvents,
  seqtaAssessmentKey,
  shouldSyncAssessment,
} from "./assessmentEventMapper";

const ORIGIN = "https://school.seqta.com.au";

describe("shouldSyncAssessment", () => {
  it("accepts upcoming assessments with due dates", () => {
    expect(
      shouldSyncAssessment({
        id: 1,
        title: "Essay",
        subject: "English",
        code: "10ENG",
        due: "2026-06-27",
      }),
    ).toBe(true);
  });

  it("rejects released marks", () => {
    expect(
      shouldSyncAssessment({
        id: 2,
        title: "Test",
        subject: "Math",
        code: "10MAT",
        due: "2026-06-27",
        status: "MARKS_RELEASED",
      }),
    ).toBe(false);
  });
});

describe("assessmentToGoogleEvent", () => {
  it("maps date-only due dates to all-day events", () => {
    const event = assessmentToGoogleEvent(
      ORIGIN,
      {
        id: 42,
        title: "Project",
        subject: "Science",
        code: "10SCI",
        due: "2026-06-27",
      },
      "Australia/Perth",
    );
    expect(event).toMatchObject({
      seqtaKey: seqtaAssessmentKey(ORIGIN, 42),
      allDay: true,
      startDate: "2026-06-27",
      endDate: "2026-06-28",
      summary: "Due: Project (Science)",
    });
  });

  it("dedupes by assessment id", () => {
    const events = mapAssessmentsToGoogleEvents(
      ORIGIN,
      [
        {
          id: 5,
          title: "A",
          subject: "X",
          code: "X",
          due: "2026-07-01",
        },
        {
          id: 5,
          title: "A duplicate",
          subject: "X",
          code: "X",
          due: "2026-07-01",
        },
      ],
      "UTC",
    );
    expect(events).toHaveLength(1);
  });
});
