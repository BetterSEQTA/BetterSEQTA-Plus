import { describe, expect, it } from "@jest/globals";
import { appointmentToLesson, parseSeqtaDateTime } from "./fetchTimetable";

describe("parseSeqtaDateTime", () => {
  it("parses SEQTA event timestamps", () => {
    expect(parseSeqtaDateTime("2026-07-20 09:30:00.0")).toEqual({
      date: "2026-07-20",
      time: "09:30",
    });
  });

  it("rejects empty values", () => {
    expect(parseSeqtaDateTime(undefined)).toBeNull();
    expect(parseSeqtaDateTime("")).toBeNull();
  });
});

describe("appointmentToLesson", () => {
  it("maps appointment payload rows into timetable lessons", () => {
    expect(
      appointmentToLesson({
        id: 5,
        from: "2026-07-20 09:30:00.0",
        until: "2026-07-20 13:10:00.0",
        event: {
          id: 5,
          title: "fsdfsdsdfdsfdsf",
          notes: "sdfsfddfsdsfdsfdfssdcfdsfsdfdsfds",
          colour: "#ffc107",
          event_type: "appointment",
        },
      }),
    ).toEqual({
      date: "2026-07-20",
      from: "09:30",
      until: "13:10",
      description: "fsdfsdsdfdsfdsf",
      type: "appointment",
      calendarid: "event:5",
      colour: "#ffc107",
      notes: "sdfsfddfsdsfdsfdfssdcfdsfsdfdsfds",
    });
  });

  it("skips incomplete appointment rows", () => {
    expect(
      appointmentToLesson({
        from: "2026-07-20 09:30:00.0",
        until: "2026-07-20 13:10:00.0",
        event: { title: "" },
      }),
    ).toBeNull();
  });
});
