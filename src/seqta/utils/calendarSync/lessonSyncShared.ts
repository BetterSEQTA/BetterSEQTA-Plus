import { verboseLog } from "@/utils/verboseLog";
import {
  getStoredEventId,
  getStoredFingerprint,
  lessonDateFromSeqtaKey,
  normalizeEventMapEntry,
  type EventMapRecord,
} from "@/seqta/utils/calendarSync/eventMap";
import { eventFingerprint } from "@/seqta/utils/calendarSync/eventFingerprint";
import type { RemoteSyncedEvent } from "@/seqta/utils/calendarSync/remoteEvents";
import {
  isDateInRange,
  syncWindowRange,
  type SyncDateRange,
} from "@/seqta/utils/googleCalendar/syncDateRange";
import type {
  GoogleCalendarDeleteResult,
  GoogleCalendarSyncOptions,
  GoogleCalendarSyncProgress,
  GoogleCalendarSyncResult,
} from "@/seqta/utils/googleCalendar/types";

export const EVENT_MAP_PERSIST_EVERY = 10;

/** Max concurrent Google/Outlook create/update/delete requests during sync. */
export const SYNC_CONCURRENCY = 2;

/** Same cap for deletes to avoid provider rate limits. */
export const SYNC_DELETE_CONCURRENCY = 2;

/** Run async work over items with a fixed concurrency pool. */
export async function mapPool<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const limit = Math.max(1, Math.min(concurrency, items.length));
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => runWorker()));
}

export type MappedLessonEvent = {
  seqtaKey: string;
  summary: string;
  location?: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
};

export function reportSyncProgress(
  onProgress: GoogleCalendarSyncOptions["onProgress"],
  progress: GoogleCalendarSyncProgress,
) {
  onProgress?.(progress);
}

export function lessonDateForEvent(startDateTime: string, seqtaKey: string): string {
  return startDateTime.slice(0, 10) || lessonDateFromSeqtaKey(seqtaKey) || "";
}

export function originEventMapEntries(
  eventMap: EventMapRecord,
  origin: string,
): Array<[string, string]> {
  const prefix = `${origin}::`;
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(eventMap)) {
    if (!key.startsWith(prefix)) continue;
    const id = getStoredEventId(value);
    if (id) entries.push([key, id]);
  }
  return entries;
}

export function entriesToPrune(
  eventMap: EventMapRecord,
  origin: string,
  mode: "full" | "incremental",
  weeksAhead: number,
  currentMapKeys: Set<string>,
): Array<[string, string]> {
  if (mode === "incremental") return [];

  const window = syncWindowRange(weeksAhead);
  const prefix = `${origin}::`;
  const entries: Array<[string, string]> = [];

  for (const [mapKey, raw] of Object.entries(eventMap)) {
    if (!mapKey.startsWith(prefix)) continue;
    const entry = normalizeEventMapEntry(raw);
    if (!entry) continue;
    const missingFromTimetable = !currentMapKeys.has(mapKey);
    const outsideWindow = entry.date ? !isDateInRange(entry.date, window) : false;
    if (missingFromTimetable || outsideWindow) {
      entries.push([mapKey, entry.id]);
    }
  }

  return entries;
}

/** Merge remote BS+ events into the local eventMap (origin-scoped keys). */
export function mergeRemoteEventsIntoMap(
  eventMap: EventMapRecord,
  origin: string,
  remoteEvents: RemoteSyncedEvent[],
  mapKey: (origin: string, seqtaKey: string) => string,
): void {
  for (const remote of remoteEvents) {
    if (!remote.seqtaKey.startsWith(origin)) continue;
    const key = mapKey(origin, remote.seqtaKey);
    const existing = normalizeEventMapEntry(eventMap[key]);
    eventMap[key] = {
      id: remote.id,
      date: remote.date || existing?.date || lessonDateFromSeqtaKey(remote.seqtaKey) || "",
      // Prefer last-written local fingerprint so skip stays stable across API format quirks.
      fingerprint: existing?.fingerprint ?? remote.fingerprint,
    };
  }
}

/**
 * Build a deduped delete list from local map + remote events for an origin.
 * Unkeyed remote events (empty seqtaKey) are included as orphan removals.
 */
export function collectOriginDeleteEntries(
  eventMap: EventMapRecord,
  origin: string,
  remoteEvents: RemoteSyncedEvent[],
  mapKey: (origin: string, seqtaKey: string) => string,
): Array<[string, string]> {
  const byId = new Map<string, string>();

  for (const [key, id] of originEventMapEntries(eventMap, origin)) {
    byId.set(id, key);
  }

  for (const remote of remoteEvents) {
    if (remote.seqtaKey && !remote.seqtaKey.startsWith(origin)) continue;
    if (byId.has(remote.id)) continue;
    const key = remote.seqtaKey
      ? mapKey(origin, remote.seqtaKey)
      : `${origin}::__orphan__:${remote.id}`;
    byId.set(remote.id, key);
  }

  return Array.from(byId.entries()).map(([id, key]) => [key, id]);
}

export function clearOriginEventMapEntries(eventMap: EventMapRecord, origin: string): void {
  const prefix = `${origin}::`;
  for (const key of Object.keys(eventMap)) {
    if (key.startsWith(prefix)) delete eventMap[key];
  }
}

export function reconcileRangeForMode(
  mode: "full" | "incremental",
  weeksAhead: number,
  ranges: {
    syncWindowRange: (weeks: number) => SyncDateRange;
    trailingWeekRange: (weeks: number) => SyncDateRange;
  },
): SyncDateRange {
  return mode === "incremental"
    ? ranges.trailingWeekRange(weeksAhead)
    : ranges.syncWindowRange(weeksAhead);
}

export function notConfiguredSyncResult(error: string): GoogleCalendarSyncResult {
  return { success: false, configured: false, error };
}

export function notConnectedSyncResult(error: string): GoogleCalendarSyncResult {
  return { success: false, configured: true, connected: false, error };
}

export function emptyLessonsSyncResult(): GoogleCalendarSyncResult {
  return {
    success: false,
    configured: true,
    connected: true,
    error: "No timetable classes found to sync for the selected range.",
  };
}

export function formatLessonSyncResultMessage(
  result: GoogleCalendarSyncResult,
  calendarLabel: string,
): string {
  const created = result.created ?? 0;
  const updated = result.updated ?? 0;
  const deleted = result.deleted ?? 0;
  const skipped = result.skipped ?? 0;
  const parts: string[] = [];
  if (created > 0) parts.push(`${created} new`);
  if (updated > 0) parts.push(`${updated} updated`);
  if (deleted > 0) parts.push(`${deleted} removed`);
  if (skipped > 0) parts.push(`${skipped} unchanged`);
  if (parts.length === 0) return `${calendarLabel} is up to date.`;
  return `${calendarLabel} updated (${parts.join(", ")}).`;
}

export function buildDeleteSyncResult(
  deleted: number,
  failed: number,
): GoogleCalendarDeleteResult {
  return {
    success: failed === 0,
    configured: true,
    connected: true,
    deleted,
    failed,
    error:
      failed > 0
        ? `Removed ${deleted} event${deleted === 1 ? "" : "s"} with ${failed} error${failed === 1 ? "" : "s"}.`
        : undefined,
  };
}

export async function deleteTrackedLessonEvents(
  entries: Array<[string, string]>,
  eventMap: EventMapRecord,
  getAccessToken: () => Promise<string>,
  deleteEvent: (
    accessToken: string,
    eventId: string,
    refreshAccessToken: () => Promise<string>,
  ) => Promise<void>,
  writeState: (patch: { eventMap: EventMapRecord }) => Promise<unknown>,
  options: {
    persistProgress?: boolean;
    onProgress?: GoogleCalendarSyncOptions["onProgress"];
    progressOffset?: number;
    progressTotal?: number;
    logLabel: string;
    concurrency?: number;
  },
): Promise<{ deleted: number; failed: number }> {
  if (entries.length === 0) return { deleted: 0, failed: 0 };

  const {
    persistProgress = false,
    onProgress,
    progressOffset = 0,
    progressTotal = 0,
    logLabel,
    concurrency = SYNC_DELETE_CONCURRENCY,
  } = options;

  let accessToken = await getAccessToken();
  const refreshAccessToken = async () => {
    accessToken = await getAccessToken();
    return accessToken;
  };
  let deleted = 0;
  let failed = 0;
  let completed = 0;
  let persistChain: Promise<unknown> = Promise.resolve();

  await mapPool(entries, concurrency, async ([mapKey, eventId]) => {
    try {
      await deleteEvent(accessToken, eventId, refreshAccessToken);
      delete eventMap[mapKey];
      deleted += 1;
    } catch (err) {
      verboseLog(`[BetterSEQTA+] ${logLabel} event delete failed:`, err);
      failed += 1;
    }

    completed += 1;
    reportSyncProgress(onProgress, {
      phase: "deleting",
      current: progressOffset + completed,
      total: progressTotal,
      message: `Removing old events (${completed}/${entries.length})…`,
    });

    if (persistProgress && completed % EVENT_MAP_PERSIST_EVERY === 0) {
      persistChain = persistChain.then(() => writeState({ eventMap }));
      await persistChain;
    }
  });

  if (persistProgress) {
    await persistChain;
  }

  return { deleted, failed };
}

export function buildLessonSyncResult(
  created: number,
  updated: number,
  deleted: number,
  skipped: number,
  failed: number,
  lastSyncAt: number,
): GoogleCalendarSyncResult {
  return {
    success: failed === 0,
    configured: true,
    connected: true,
    created,
    updated,
    deleted,
    skipped,
    failed,
    lastSyncAt,
    error:
      failed > 0
        ? `Synced with ${failed} error${failed === 1 ? "" : "s"}. Check the console for details.`
        : undefined,
  };
}

type UpsertLessonEventsParams<TEvent extends MappedLessonEvent> = {
  events: TEvent[];
  eventMap: EventMapRecord;
  origin: string;
  staleEntryCount: number;
  totalSteps: number;
  lastSyncAt: number;
  initialFailed: number;
  getAccessToken: () => Promise<string>;
  mapKey: (origin: string, seqtaKey: string) => string;
  upsert: (
    accessToken: string,
    existingId: string | undefined,
    event: TEvent,
    refreshAccessToken: () => Promise<string>,
  ) => Promise<string>;
  writeState: (patch: {
    eventMap: EventMapRecord;
    lastSyncAt: number;
    lastSyncOrigin: string;
  }) => Promise<unknown>;
  onProgress?: GoogleCalendarSyncOptions["onProgress"];
  logLabel: string;
  concurrency?: number;
};

export async function upsertLessonEvents<TEvent extends MappedLessonEvent>(
  params: UpsertLessonEventsParams<TEvent>,
): Promise<{
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  accessToken: string;
}> {
  const {
    events,
    eventMap,
    origin,
    staleEntryCount,
    totalSteps,
    lastSyncAt,
    initialFailed,
    getAccessToken,
    mapKey,
    upsert,
    writeState,
    onProgress,
    logLabel,
    concurrency = SYNC_CONCURRENCY,
  } = params;

  let accessToken = await getAccessToken();
  const refreshAccessToken = async () => {
    accessToken = await getAccessToken();
    return accessToken;
  };
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = initialFailed;
  let completed = 0;
  let persistChain: Promise<unknown> = Promise.resolve();

  const persistState = () => {
    persistChain = persistChain.then(() =>
      writeState({ eventMap, lastSyncAt, lastSyncOrigin: origin }),
    );
    return persistChain;
  };

  await mapPool(events, concurrency, async (event) => {
    const key = mapKey(origin, event.seqtaKey);
    const existingId = getStoredEventId(eventMap[key]);
    const desiredFingerprint = eventFingerprint(event);

    try {
      if (existingId && getStoredFingerprint(eventMap[key]) === desiredFingerprint) {
        skipped += 1;
      } else {
        const remoteId = await upsert(accessToken, existingId, event, refreshAccessToken);
        if (existingId) updated += 1;
        else created += 1;
        eventMap[key] = {
          id: remoteId,
          date: lessonDateForEvent(event.startDateTime, event.seqtaKey),
          fingerprint: desiredFingerprint,
        };
      }
    } catch (err) {
      verboseLog(`[BetterSEQTA+] ${logLabel} event sync failed:`, err);
      failed += 1;
    }

    completed += 1;
    reportSyncProgress(onProgress, {
      phase: "upserting",
      current: staleEntryCount + completed,
      total: totalSteps,
      message: `Syncing events (${completed}/${events.length})…`,
    });

    if (completed % EVENT_MAP_PERSIST_EVERY === 0) {
      await persistState();
    }
  });

  if (events.length > 0) {
    await persistState();
  }

  return { created, updated, skipped, failed, accessToken };
}
