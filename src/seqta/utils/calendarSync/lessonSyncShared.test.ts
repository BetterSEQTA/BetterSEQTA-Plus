import { describe, expect, it, jest } from "@jest/globals";

jest.mock("@/utils/verboseLog", () => ({
  verboseLog: jest.fn(),
}));

import {
  eventFingerprint,
  outlookDescriptionWithKey,
  parseOutlookSeqtaKey,
} from "./eventFingerprint";
import {
  buildLessonSyncResult,
  collectOriginDeleteEntries,
  entriesToPrune,
  formatLessonSyncResultMessage,
  mapPool,
  mergeRemoteEventsIntoMap,
  reportSyncProgress,
  upsertLessonEvents,
} from "./lessonSyncShared";
import type { GoogleCalendarSyncProgress } from "@/seqta/utils/googleCalendar/types";
import { syncWindowRange } from "@/seqta/utils/googleCalendar/syncDateRange";

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

describe("eventFingerprint", () => {
  it("is stable for equivalent event content", () => {
    const base = {
      summary: "Math",
      location: "MA1",
      description: "Synced by BetterSEQTA+",
      startDateTime: "2026-07-13T09:00:00",
      endDateTime: "2026-07-13T10:00:00",
      timeZone: "Australia/Adelaide",
    };
    expect(eventFingerprint(base)).toBe(eventFingerprint({ ...base }));
    expect(eventFingerprint(base)).not.toBe(
      eventFingerprint({ ...base, summary: "English" }),
    );
  });
});

describe("outlook Key helpers", () => {
  it("embeds and parses Key lines", () => {
    const withKey = outlookDescriptionWithKey("Synced by BetterSEQTA+\nTeacher: A", "origin:cal:1");
    expect(withKey).toContain("Key: origin:cal:1");
    expect(parseOutlookSeqtaKey(withKey)).toBe("origin:cal:1");
    expect(outlookDescriptionWithKey(withKey, "origin:cal:2")).toContain("Key: origin:cal:2");
    expect(outlookDescriptionWithKey(withKey, "origin:cal:2").match(/^Key:/gm)).toHaveLength(1);
  });
});

describe("entriesToPrune", () => {
  const origin = "https://school.seqta.com.au";
  const weeksAhead = 12;
  const syncDate = syncWindowRange(weeksAhead).from;
  const mapKey = `${origin}::${origin}:cal:1`;
  const cancelledKey = `${origin}::${origin}:cal:cancelled`;

  it("returns nothing for incremental mode", () => {
    expect(
      entriesToPrune(
        { [mapKey]: { id: "evt-1", date: syncDate } },
        origin,
        "incremental",
        weeksAhead,
        new Set([mapKey]),
      ),
    ).toEqual([]);
  });

  it("prunes cancelled lessons still inside the sync window", () => {
    const pruned = entriesToPrune(
      {
        [mapKey]: { id: "evt-1", date: syncDate },
        [cancelledKey]: { id: "evt-cancelled", date: syncDate },
      },
      origin,
      "full",
      weeksAhead,
      new Set([mapKey]),
    );
    expect(pruned).toEqual([[cancelledKey, "evt-cancelled"]]);
  });

  it("prunes events whose date is outside the sync window", () => {
    const staleKey = `${origin}::${origin}:cal:old`;
    const pruned = entriesToPrune(
      { [staleKey]: { id: "evt-old", date: "2020-01-06" } },
      origin,
      "full",
      weeksAhead,
      new Set(),
    );
    expect(pruned).toEqual([[staleKey, "evt-old"]]);
  });
});

describe("mergeRemoteEventsIntoMap", () => {
  const origin = "https://school.seqta.com.au";
  const mapKey = (o: string, seqtaKey: string) => `${o}::${seqtaKey}`;

  it("recovers remote IDs for the current origin only", () => {
    const eventMap: Record<string, { id: string; date: string; fingerprint?: string }> = {};
    mergeRemoteEventsIntoMap(
      eventMap,
      origin,
      [
        {
          seqtaKey: `${origin}:cal:1`,
          id: "remote-1",
          date: "2026-07-13",
          fingerprint: "fp-1",
        },
        {
          seqtaKey: "https://other.seqta.com.au:cal:2",
          id: "remote-other",
          date: "2026-07-13",
          fingerprint: "fp-other",
        },
      ],
      mapKey,
    );

    expect(eventMap[`${origin}::${origin}:cal:1`]).toMatchObject({
      id: "remote-1",
      fingerprint: "fp-1",
    });
    expect(eventMap[`${origin}::https://other.seqta.com.au:cal:2`]).toBeUndefined();
  });

  it("keeps an existing local fingerprint when reconciling", () => {
    const key = `${origin}::${origin}:cal:1`;
    const eventMap = {
      [key]: { id: "old-id", date: "2026-07-13", fingerprint: "local-fp" },
    };
    mergeRemoteEventsIntoMap(
      eventMap,
      origin,
      [
        {
          seqtaKey: `${origin}:cal:1`,
          id: "remote-1",
          date: "2026-07-13",
          fingerprint: "remote-fp",
        },
      ],
      mapKey,
    );
    expect(eventMap[key]).toMatchObject({ id: "remote-1", fingerprint: "local-fp" });
  });
});

describe("collectOriginDeleteEntries", () => {
  const origin = "https://school.seqta.com.au";
  const mapKey = (o: string, seqtaKey: string) => `${o}::${seqtaKey}`;

  it("includes local map entries and matching remote events", () => {
    const eventMap = {
      [`${origin}::${origin}:cal:1`]: { id: "local-1", date: "2026-07-13" },
    };
    const entries = collectOriginDeleteEntries(
      eventMap,
      origin,
      [
        {
          seqtaKey: `${origin}:cal:2`,
          id: "remote-2",
          date: "2026-07-14",
          fingerprint: "fp",
        },
        {
          seqtaKey: "",
          id: "orphan-3",
          date: "2026-07-15",
          fingerprint: "fp",
        },
        {
          seqtaKey: "https://other.seqta.com.au:cal:9",
          id: "other",
          date: "2026-07-15",
          fingerprint: "fp",
        },
      ],
      mapKey,
    );

    const ids = entries.map(([, id]) => id).sort();
    expect(ids).toEqual(["local-1", "orphan-3", "remote-2"]);
  });
});

describe("formatLessonSyncResultMessage", () => {
  it("includes unchanged counts", () => {
    expect(
      formatLessonSyncResultMessage(
        { success: true, created: 1, updated: 2, deleted: 0, skipped: 3 },
        "Google Calendar",
      ),
    ).toBe("Google Calendar updated (1 new, 2 updated, 3 unchanged).");
  });

  it("reports up to date when nothing changed", () => {
    expect(
      formatLessonSyncResultMessage(
        buildLessonSyncResult(0, 0, 0, 0, 0, Date.now()),
        "Outlook Calendar",
      ),
    ).toBe("Outlook Calendar is up to date.");
  });
});

describe("upsertLessonEvents skip unchanged", () => {
  it("skips API writes when fingerprint matches", async () => {
    const origin = "https://school.seqta.com.au";
    const event = {
      seqtaKey: `${origin}:cal:1`,
      summary: "Math",
      description: "Synced by BetterSEQTA+",
      startDateTime: "2026-07-13T09:00:00",
      endDateTime: "2026-07-13T10:00:00",
      timeZone: "UTC",
    };
    const fp = eventFingerprint(event);
    const key = `${origin}::${event.seqtaKey}`;
    const eventMap = {
      [key]: { id: "existing", date: "2026-07-13", fingerprint: fp },
    };
    const upsert = jest.fn(async () => "existing");

    const result = await upsertLessonEvents({
      events: [event],
      eventMap,
      origin,
      staleEntryCount: 0,
      totalSteps: 1,
      lastSyncAt: Date.now(),
      initialFailed: 0,
      getAccessToken: async () => "token",
      mapKey: (o, k) => `${o}::${k}`,
      upsert,
      writeState: async () => undefined,
      logLabel: "Test",
    });

    expect(upsert).not.toHaveBeenCalled();
    expect(result).toMatchObject({ created: 0, updated: 0, skipped: 1, failed: 0 });
  });

  it("runs upserts concurrently", async () => {
    const origin = "https://school.seqta.com.au";
    let inFlight = 0;
    let maxInFlight = 0;
    const events = Array.from({ length: 6 }, (_, i) => ({
      seqtaKey: `${origin}:cal:${i}`,
      summary: `Class ${i}`,
      description: "Synced by BetterSEQTA+",
      startDateTime: "2026-07-13T09:00:00",
      endDateTime: "2026-07-13T10:00:00",
      timeZone: "UTC",
    }));

    const upsert = jest.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 30));
      inFlight -= 1;
      return `id-${Math.random()}`;
    });

    const result = await upsertLessonEvents({
      events,
      eventMap: {},
      origin,
      staleEntryCount: 0,
      totalSteps: events.length,
      lastSyncAt: Date.now(),
      initialFailed: 0,
      getAccessToken: async () => "token",
      mapKey: (o, k) => `${o}::${k}`,
      upsert,
      writeState: async () => undefined,
      logLabel: "Test",
      concurrency: 2,
    });

    expect(result.created).toBe(6);
    expect(upsert).toHaveBeenCalledTimes(6);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});

describe("mapPool", () => {
  it("limits concurrency", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    await mapPool([1, 2, 3, 4, 5], 2, async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
    });
    expect(maxInFlight).toBe(2);
  });
});
