import { verboseLog } from "@/utils/verboseLog";
import {
  getStoredEventId,
  lessonDateFromSeqtaKey,
  normalizeEventMapEntry,
} from "@/seqta/utils/googleCalendar/eventMapEntry";
import {
  isDateInRange,
  syncWindowRange,
} from "@/seqta/utils/googleCalendar/syncDateRange";
import type {
  GoogleCalendarSyncOptions,
  GoogleCalendarSyncProgress,
  GoogleCalendarSyncResult,
} from "@/seqta/utils/googleCalendar/types";

export const EVENT_MAP_PERSIST_EVERY = 10;

export type EventMapRecord = Record<string, string | { id: string; date: string }>;

export type MappedLessonEvent = {
  seqtaKey: string;
  startDateTime: string;
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

function shouldPruneEntry(
  mode: "full" | "incremental",
  entry: { id: string; date: string },
  mapKey: string,
  window: ReturnType<typeof syncWindowRange>,
  currentMapKeys: Set<string>,
): boolean {
  if (mode === "incremental") return false;
  if (entry.date) return !isDateInRange(entry.date, window);
  return !currentMapKeys.has(mapKey);
}

export function entriesToPrune(
  eventMap: EventMapRecord,
  origin: string,
  mode: "full" | "incremental",
  weeksAhead: number,
  currentMapKeys: Set<string>,
): Array<[string, string]> {
  const window = syncWindowRange(weeksAhead);
  const prefix = `${origin}::`;
  const entries: Array<[string, string]> = [];

  for (const [mapKey, raw] of Object.entries(eventMap)) {
    if (!mapKey.startsWith(prefix)) continue;
    const entry = normalizeEventMapEntry(raw);
    if (!entry) continue;
    if (shouldPruneEntry(mode, entry, mapKey, window, currentMapKeys)) {
      entries.push([mapKey, entry.id]);
    }
  }

  return entries;
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

export function buildLessonSyncResult(
  created: number,
  updated: number,
  deleted: number,
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
    skipped: 0,
    failed,
    lastSyncAt,
    error:
      failed > 0
        ? `Synced with ${failed} error${failed === 1 ? "" : "s"}. Check the console for details.`
        : undefined,
  };
}

export async function persistFinalSyncState(
  writeState: (patch: {
    eventMap: EventMapRecord;
    lastSyncAt: number;
    lastSyncOrigin: string;
  }) => Promise<unknown>,
  eventMap: EventMapRecord,
  lastSyncAt: number,
  origin: string,
  staleDeleted: number,
  staleEntryCount: number,
  eventCount: number,
): Promise<void> {
  if (staleDeleted > 0 || staleEntryCount > 0 || eventCount > 0) {
    await writeState({ eventMap, lastSyncAt, lastSyncOrigin: origin });
  }
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
};

export async function upsertLessonEvents<TEvent extends MappedLessonEvent>(
  params: UpsertLessonEventsParams<TEvent>,
): Promise<{ created: number; updated: number; failed: number; accessToken: string }> {
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
  } = params;

  let accessToken = await getAccessToken();
  let created = 0;
  let updated = 0;
  let failed = initialFailed;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const key = mapKey(origin, event.seqtaKey);
    const existingId = getStoredEventId(eventMap[key]);
    const progressCurrent = staleEntryCount + i + 1;
    const progressMessage = `Syncing events (${i + 1}/${events.length})…`;

    try {
      const remoteId = await upsert(accessToken, existingId, event, async () => {
        accessToken = await getAccessToken();
        return accessToken;
      });
      if (existingId) updated += 1;
      else created += 1;
      eventMap[key] = {
        id: remoteId,
        date: lessonDateForEvent(event.startDateTime, event.seqtaKey),
      };

      reportSyncProgress(onProgress, {
        phase: "upserting",
        current: progressCurrent,
        total: totalSteps,
        message: progressMessage,
      });

      if ((i + 1) % EVENT_MAP_PERSIST_EVERY === 0 || i === events.length - 1) {
        await writeState({ eventMap, lastSyncAt, lastSyncOrigin: origin });
      }
    } catch (err) {
      verboseLog(`[BetterSEQTA+] ${logLabel} event sync failed:`, err);
      failed += 1;
      reportSyncProgress(onProgress, {
        phase: "upserting",
        current: progressCurrent,
        total: totalSteps,
        message: progressMessage,
      });
    }
  }

  return { created, updated, failed, accessToken };
}
