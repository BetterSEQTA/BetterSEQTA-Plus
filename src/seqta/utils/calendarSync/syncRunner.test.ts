import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@/seqta/utils/googleCalendar/fetchTimetable", () => ({
  fetchAssessmentsForCalendarSync: jest.fn(async () => []),
  fetchTimetableForSync: jest.fn(async () => []),
  fetchTimetableLessons: jest.fn(async () => []),
}));

jest.mock("@/seqta/utils/calendarSync/syncEngine", () => ({
  googleLessonSyncProvider: {},
  outlookLessonSyncProvider: {},
  syncLessonsToCalendar: jest.fn(),
}));

jest.mock("@/seqta/utils/calendarSync/settings", () => ({
  CALENDAR_SYNC_HEARTBEAT_MS: 10_000,
  calendarSyncInProgressStorageKey: (provider: string) =>
    `bsplus_calendar_sync_in_progress_${provider}`,
  clearCalendarSyncInProgressMarker: jest.fn(async () => undefined),
  getSyncAssessmentDueDates: jest.fn(async () => false),
  getSyncWeeksAhead: jest.fn(async () => 12),
  isCalendarSyncRunningElsewhere: jest.fn(async () => false),
  readResumableCalendarSync: jest.fn(async () => null),
  releaseCalendarSyncLock: jest.fn(async () => undefined),
  tryAcquireCalendarSyncLock: jest.fn(async () => ({
    acquired: true as const,
    lockId: "test-lock",
    marker: {
      provider: "google" as const,
      mode: "full" as const,
      origin: "https://school.seqta.com.au",
      startedAt: Date.now(),
      heartbeatAt: Date.now(),
      lockId: "test-lock",
    },
  })),
}));

import { syncLessonsToCalendar } from "@/seqta/utils/calendarSync/syncEngine";
import {
  __resetActiveCalendarSyncsForTests,
  runGoogleCalendarSync,
} from "@/seqta/utils/calendarSync/syncRunner";

describe("runCalendarSync coalescing", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "location", {
      value: { origin: "https://school.seqta.com.au" },
      configurable: true,
    });
    __resetActiveCalendarSyncsForTests();
    jest.mocked(syncLessonsToCalendar).mockReset();
  });

  it("returns the same in-flight promise for overlapping syncs in one tab", async () => {
    let resolveSync!: (value: { success: true }) => void;
    const syncPromise = new Promise<{ success: true }>((resolve) => {
      resolveSync = resolve;
    });
    jest.mocked(syncLessonsToCalendar).mockReturnValue(syncPromise);

    const first = runGoogleCalendarSync();
    const second = runGoogleCalendarSync();

    expect(second).toBe(first);

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(syncLessonsToCalendar).toHaveBeenCalledTimes(1);

    resolveSync({ success: true });
    await first;
  });
});
