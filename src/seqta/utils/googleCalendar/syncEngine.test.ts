import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { SeqtaTimetableLesson } from "./types";

jest.mock("@/config/googleCalendar", () => ({
  isGoogleCalendarConfigured: jest.fn(() => true),
}));

jest.mock("@/utils/verboseLog", () => ({
  verboseLog: jest.fn(),
}));

jest.mock("@/seqta/utils/googleCalendar/storage", () => {
  const actual = jest.requireActual<typeof import("@/seqta/utils/googleCalendar/storage")>(
    "@/seqta/utils/googleCalendar/storage",
  );
  return {
    ...actual,
    readGoogleCalendarState: jest.fn(),
    writeGoogleCalendarState: jest.fn(async (patch: unknown) => patch),
  };
});

jest.mock("@/seqta/utils/calendarSync/settings", () => ({
  getSyncWeeksAhead: jest.fn(async () => 12),
}));

jest.mock("@/seqta/utils/calendarSync/remoteEvents", () => ({
  upsertGoogleCalendarEvent: jest.fn(),
  deleteGoogleCalendarEvent: jest.fn(),
}));

import { readGoogleCalendarState } from "@/seqta/utils/googleCalendar/storage";
import {
  deleteGoogleCalendarEvent,
  upsertGoogleCalendarEvent,
} from "@/seqta/utils/calendarSync/remoteEvents";
import { deleteSyncedEventsFromGoogleCalendar, syncLessonsToGoogleCalendar } from "@/seqta/utils/calendarSync/syncEngine";

const ORIGIN = "https://school.seqta.com.au";
const getAccessToken = async () => "test-token";

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

describe("syncLessonsToGoogleCalendar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(readGoogleCalendarState).mockResolvedValue({
      refreshToken: "refresh",
      eventMap: {
        [`${ORIGIN}::${ORIGIN}:cal:12345`]: { id: "google-existing", date: "2026-06-27" },
        [`${ORIGIN}::${ORIGIN}:cal:99999`]: { id: "google-stale", date: "2020-01-06" },
      },
    });
    jest.mocked(upsertGoogleCalendarEvent).mockResolvedValue("google-existing");
    jest.mocked(deleteGoogleCalendarEvent).mockResolvedValue(undefined);
  });

  it("updates existing events and removes stale tracked events on full sync", async () => {
    const result = await syncLessonsToGoogleCalendar(
      { origin: ORIGIN, lessons: [baseLesson], mode: "full" },
      getAccessToken,
    );

    expect(deleteGoogleCalendarEvent).toHaveBeenCalled();
    expect(upsertGoogleCalendarEvent).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      success: true,
      created: 0,
      updated: 1,
      failed: 0,
    });
  });

  it("creates events that are not yet tracked", async () => {
    jest.mocked(readGoogleCalendarState).mockResolvedValue({
      refreshToken: "refresh",
      eventMap: {},
    });
    jest.mocked(upsertGoogleCalendarEvent).mockResolvedValue("google-new");

    const result = await syncLessonsToGoogleCalendar(
      { origin: ORIGIN, lessons: [baseLesson], mode: "full" },
      getAccessToken,
    );

    expect(deleteGoogleCalendarEvent).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      created: 1,
      updated: 0,
      deleted: 0,
    });
  });

  it("does not delete events during incremental sync", async () => {
    const result = await syncLessonsToGoogleCalendar(
      { origin: ORIGIN, lessons: [baseLesson], mode: "incremental" },
      getAccessToken,
    );

    expect(deleteGoogleCalendarEvent).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      deleted: 0,
    });
  });

  it("reports progress while syncing", async () => {
    const progress: Array<{ phase: string; current: number; total: number }> = [];
    await syncLessonsToGoogleCalendar(
      { origin: ORIGIN, lessons: [baseLesson], mode: "full" },
      getAccessToken,
      {
        onProgress: (entry) => progress.push(entry),
      },
    );

    expect(progress.some((entry) => entry.phase === "upserting")).toBe(true);
    expect(progress.at(-1)?.phase).toBe("done");
  });
});

describe("deleteSyncedEventsFromGoogleCalendar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(readGoogleCalendarState).mockResolvedValue({
      refreshToken: "refresh",
      eventMap: {
        [`${ORIGIN}::${ORIGIN}:cal:12345`]: { id: "google-1", date: "2026-06-27" },
        [`${ORIGIN}::${ORIGIN}:cal:99999`]: { id: "google-2", date: "2026-06-28" },
        "https://other.seqta.com.au::other:key": { id: "google-other", date: "2026-06-28" },
      },
    });
    jest.mocked(deleteGoogleCalendarEvent).mockResolvedValue(undefined);
  });

  it("deletes only events for the requested origin", async () => {
    const result = await deleteSyncedEventsFromGoogleCalendar(ORIGIN, getAccessToken);

    expect(deleteGoogleCalendarEvent).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      success: true,
      deleted: 2,
      failed: 0,
    });
  });
});
