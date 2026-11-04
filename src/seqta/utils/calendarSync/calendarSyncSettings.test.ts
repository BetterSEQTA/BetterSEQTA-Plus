import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import browser from "@/lib/browser";
import {
  BSPLUS_CALENDAR_SYNC_IN_PROGRESS_KEY,
  CALENDAR_SYNC_HEARTBEAT_MS,
  calendarSyncInProgressStorageKey,
  isCalendarSyncRunningElsewhere,
  readResumableCalendarSync,
  tryAcquireCalendarSyncLock,
} from "./settings";

const origin = "https://school.seqta.com.au";

describe("calendar sync cross-tab lock", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "location", {
      value: { origin },
      configurable: true,
    });
  });

  it("reports no sync elsewhere when marker is missing", async () => {
    expect(await isCalendarSyncRunningElsewhere("google")).toBe(false);
    expect(await isCalendarSyncRunningElsewhere("outlook")).toBe(false);
  });

  it("uses separate in-progress keys per provider", async () => {
    const now = Date.now();
    await browser.storage.local.set({
      [calendarSyncInProgressStorageKey("google")]: {
        provider: "google",
        mode: "full",
        origin,
        startedAt: now,
        heartbeatAt: now,
        lockId: "google-lock",
      },
      [calendarSyncInProgressStorageKey("outlook")]: {
        provider: "outlook",
        mode: "full",
        origin,
        startedAt: now,
        heartbeatAt: now,
        lockId: "outlook-lock",
      },
    });

    expect(await isCalendarSyncRunningElsewhere("google")).toBe(true);
    expect(await isCalendarSyncRunningElsewhere("outlook")).toBe(true);
  });

  it("treats stale heartbeats as not running elsewhere", async () => {
    const stale = Date.now() - 60_000;
    await browser.storage.local.set({
      [calendarSyncInProgressStorageKey("google")]: {
        provider: "google",
        mode: "full",
        origin,
        startedAt: stale,
        heartbeatAt: stale,
      },
    });

    expect(await isCalendarSyncRunningElsewhere("google")).toBe(false);
    expect(await readResumableCalendarSync()).toMatchObject({ provider: "google" });
  });

  it("acquires lock and rejects when another tab holds a live marker", async () => {
    const first = await tryAcquireCalendarSyncLock("google", "full");
    expect(first.acquired).toBe(true);

    const second = await tryAcquireCalendarSyncLock("google", "full");
    expect(second.acquired).toBe(false);
  });

  it("loses acquire when storage contains another tab's lockId after write", async () => {
    const key = calendarSyncInProgressStorageKey("google");
    const originalSet = browser.storage.local.set.getMockImplementation();
    browser.storage.local.set.mockImplementation(async (items: Record<string, unknown>) => {
      if (key in items) {
        await originalSet?.({
          [key]: {
            ...(items[key] as object),
            lockId: "other-tab",
          },
        });
        return;
      }
      await originalSet?.(items);
    });

    const result = await tryAcquireCalendarSyncLock("google", "incremental");
    expect(result.acquired).toBe(false);
  });

  it("migrates legacy in-progress key to per-provider storage", async () => {
    const now = Date.now();
    await browser.storage.local.set({
      [BSPLUS_CALENDAR_SYNC_IN_PROGRESS_KEY]: {
        provider: "outlook",
        mode: "incremental",
        origin,
        startedAt: now,
        heartbeatAt: now,
      },
    });

    expect(await isCalendarSyncRunningElsewhere("outlook")).toBe(true);
    expect(await browser.storage.local.get(BSPLUS_CALENDAR_SYNC_IN_PROGRESS_KEY)).toEqual({});
  });
});

describe("calendar sync heartbeat constant", () => {
  it("refreshes at most every ten seconds", () => {
    expect(CALENDAR_SYNC_HEARTBEAT_MS).toBe(10_000);
  });
});
