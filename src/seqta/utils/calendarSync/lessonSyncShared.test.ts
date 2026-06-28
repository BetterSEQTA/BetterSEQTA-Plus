import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@/utils/verboseLog", () => ({
  verboseLog: jest.fn(),
}));

import {
  reportSyncProgress,
  resetSyncProgressThrottle,
  SYNC_PROGRESS_THROTTLE_MS,
} from "./lessonSyncShared";
import type { GoogleCalendarSyncProgress } from "@/seqta/utils/googleCalendar/types";

describe("reportSyncProgress", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-28T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("reports preparing and done immediately", () => {
    const onProgress = jest.fn();
    const preparing: GoogleCalendarSyncProgress = {
      phase: "preparing",
      current: 0,
      total: 10,
      message: "Preparing…",
    };
    const done: GoogleCalendarSyncProgress = {
      phase: "done",
      current: 10,
      total: 10,
      message: "Done",
    };

    reportSyncProgress(onProgress, preparing);
    reportSyncProgress(onProgress, done);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, preparing);
    expect(onProgress).toHaveBeenNthCalledWith(2, done);
  });

  it("throttles upserting progress to at most once per second", () => {
    const onProgress = jest.fn();

    for (let i = 1; i <= 5; i++) {
      reportSyncProgress(onProgress, {
        phase: "upserting",
        current: i,
        total: 5,
        message: `Syncing events (${i}/5)…`,
      });
    }

    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith({
      phase: "upserting",
      current: 1,
      total: 5,
      message: "Syncing events (1/5)…",
    });

    jest.advanceTimersByTime(SYNC_PROGRESS_THROTTLE_MS);

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith({
      phase: "upserting",
      current: 5,
      total: 5,
      message: "Syncing events (5/5)…",
    });
  });

  it("flushes pending progress before reporting done", () => {
    const onProgress = jest.fn();

    reportSyncProgress(onProgress, {
      phase: "upserting",
      current: 1,
      total: 5,
      message: "Syncing events (1/5)…",
    });

    reportSyncProgress(onProgress, {
      phase: "upserting",
      current: 4,
      total: 5,
      message: "Syncing events (4/5)…",
    });

    reportSyncProgress(onProgress, {
      phase: "done",
      current: 5,
      total: 5,
      message: "Sync complete",
    });

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      phase: "upserting",
      current: 1,
      total: 5,
      message: "Syncing events (1/5)…",
    });
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      phase: "upserting",
      current: 4,
      total: 5,
      message: "Syncing events (4/5)…",
    });
    expect(onProgress).toHaveBeenNthCalledWith(3, {
      phase: "done",
      current: 5,
      total: 5,
      message: "Sync complete",
    });
  });

  it("resetSyncProgressThrottle clears queued updates", () => {
    const onProgress = jest.fn();

    reportSyncProgress(onProgress, {
      phase: "upserting",
      current: 1,
      total: 3,
      message: "Syncing events (1/3)…",
    });

    resetSyncProgressThrottle(onProgress);
    jest.advanceTimersByTime(SYNC_PROGRESS_THROTTLE_MS);

    expect(onProgress).toHaveBeenCalledTimes(1);
  });
});
