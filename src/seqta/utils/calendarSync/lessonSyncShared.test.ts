import { describe, expect, it, jest } from "@jest/globals";

jest.mock("@/utils/verboseLog", () => ({
  verboseLog: jest.fn(),
}));

import { reportSyncProgress } from "./lessonSyncShared";
import type { GoogleCalendarSyncProgress } from "@/seqta/utils/googleCalendar/types";

describe("reportSyncProgress", () => {
  it("calls onProgress when provided", () => {
    const onProgress = jest.fn();
    const progress: GoogleCalendarSyncProgress = {
      phase: "upserting",
      current: 1,
      total: 5,
      message: "Syncing events (1/5)…",
    };

    reportSyncProgress(onProgress, progress);
    reportSyncProgress(undefined, progress);

    expect(onProgress).toHaveBeenCalledTimes(1);
    expect(onProgress).toHaveBeenCalledWith(progress);
  });
});
