import { verboseLog } from "@/utils/verboseLog";
import { isOutlookCalendarConfigured } from "@/config/outlookCalendar";
import { getSyncWeeksAhead } from "@/seqta/utils/calendarSync/settings";
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
  GoogleCalendarDeleteResult,
  GoogleCalendarSyncOptions,
  GoogleCalendarSyncProgress,
  GoogleCalendarSyncRequest,
  GoogleCalendarSyncResult,
} from "@/seqta/utils/googleCalendar/types";
import {
  mapLessonsToOutlookEvents,
  outlookGraphEventBody,
} from "@/seqta/utils/outlookCalendar/eventMapper";
import {
  outlookEventMapKey,
  readOutlookCalendarState,
  writeOutlookCalendarState,
} from "@/seqta/utils/outlookCalendar/storage";
import {
  deleteOutlookCalendarEvent,
  upsertOutlookCalendarEvent,
} from "@/seqta/utils/outlookCalendar/upsertEvent";

const EVENT_MAP_PERSIST_EVERY = 10;

type DeleteTrackedEventsResult = {
  deleted: number;
  failed: number;
};

function reportProgress(
  onProgress: GoogleCalendarSyncOptions["onProgress"],
  progress: GoogleCalendarSyncProgress,
) {
  onProgress?.(progress);
}

function lessonDateForEvent(startDateTime: string, seqtaKey: string): string {
  return startDateTime.slice(0, 10) || lessonDateFromSeqtaKey(seqtaKey) || "";
}

async function deleteTrackedEventsFromOutlook(
  entries: Array<[string, string]>,
  eventMap: Record<string, string | { id: string; date: string }>,
  getAccessToken: () => Promise<string>,
  persistProgress = false,
  onProgress?: GoogleCalendarSyncOptions["onProgress"],
  progressOffset = 0,
  progressTotal = 0,
): Promise<DeleteTrackedEventsResult> {
  if (entries.length === 0) return { deleted: 0, failed: 0 };

  let accessToken = await getAccessToken();
  let deleted = 0;
  let failed = 0;

  for (const [mapKey, eventId] of entries) {
    try {
      await deleteOutlookCalendarEvent(accessToken, eventId, async () => {
        accessToken = await getAccessToken();
        return accessToken;
      });
      delete eventMap[mapKey];
      deleted += 1;

      reportProgress(onProgress, {
        phase: "deleting",
        current: progressOffset + deleted + failed,
        total: progressTotal,
        message: `Removing old events (${deleted + failed}/${entries.length})…`,
      });

      if (persistProgress && (deleted + failed) % EVENT_MAP_PERSIST_EVERY === 0) {
        await writeOutlookCalendarState({ eventMap });
      }
    } catch (err) {
      verboseLog("[BetterSEQTA+] Outlook Calendar event delete failed:", err);
      failed += 1;
      reportProgress(onProgress, {
        phase: "deleting",
        current: progressOffset + deleted + failed,
        total: progressTotal,
        message: `Removing old events (${deleted + failed}/${entries.length})…`,
      });
    }
  }

  return { deleted, failed };
}

function originEventMapEntries(
  eventMap: Record<string, string | { id: string; date: string }>,
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

function entriesToPrune(
  eventMap: Record<string, string | { id: string; date: string }>,
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

    let shouldDelete = false;
    if (mode === "incremental") {
      shouldDelete = false;
    } else if (entry.date) {
      shouldDelete = !isDateInRange(entry.date, window);
    } else {
      shouldDelete = !currentMapKeys.has(mapKey);
    }

    if (shouldDelete) entries.push([mapKey, entry.id]);
  }

  return entries;
}

export async function syncLessonsToOutlookCalendar(
  request: GoogleCalendarSyncRequest,
  getAccessToken: () => Promise<string>,
  options: GoogleCalendarSyncOptions = {},
): Promise<GoogleCalendarSyncResult> {
  if (!isOutlookCalendarConfigured()) {
    return {
      success: false,
      configured: false,
      error: "Outlook Calendar is not configured in this extension build.",
    };
  }

  const state = await readOutlookCalendarState();
  if (!state.refreshToken && !state.accessToken) {
    return { success: false, configured: true, connected: false, error: "Connect Outlook Calendar first." };
  }

  const mode = request.mode ?? "full";
  const weeksAhead = request.weeksAhead ?? (await getSyncWeeksAhead());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const events = mapLessonsToOutlookEvents(request.origin, request.lessons, timeZone);

  if (events.length === 0 && mode === "full") {
    return {
      success: false,
      configured: true,
      connected: true,
      error: "No timetable classes found to sync for the selected range.",
    };
  }

  reportProgress(options.onProgress, {
    phase: "preparing",
    current: 0,
    total: Math.max(events.length, 1),
    message: mode === "incremental" ? "Preparing weekly sync…" : "Preparing sync…",
  });

  let accessToken = await getAccessToken();
  const eventMap = { ...(state.eventMap ?? {}) };
  const currentMapKeys = new Set(
    events.map((event) => outlookEventMapKey(request.origin, event.seqtaKey)),
  );
  const staleEntries = entriesToPrune(eventMap, request.origin, mode, weeksAhead, currentMapKeys);
  const totalSteps = staleEntries.length + events.length;

  const staleResult = await deleteTrackedEventsFromOutlook(
    staleEntries,
    eventMap,
    getAccessToken,
    false,
    options.onProgress,
    0,
    totalSteps,
  );

  let created = 0;
  let updated = 0;
  let failed = staleResult.failed;
  const lastSyncAt = Date.now();

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const mapKey = outlookEventMapKey(request.origin, event.seqtaKey);
    const existingId = getStoredEventId(eventMap[mapKey]);
    try {
      const outlookId = await upsertOutlookCalendarEvent(
        accessToken,
        existingId,
        outlookGraphEventBody(event),
        async () => {
          accessToken = await getAccessToken();
          return accessToken;
        },
      );
      if (existingId) updated += 1;
      else created += 1;
      eventMap[mapKey] = {
        id: outlookId,
        date: lessonDateForEvent(event.startDateTime, event.seqtaKey),
      };

      reportProgress(options.onProgress, {
        phase: "upserting",
        current: staleEntries.length + i + 1,
        total: totalSteps,
        message: `Syncing events (${i + 1}/${events.length})…`,
      });

      if ((i + 1) % EVENT_MAP_PERSIST_EVERY === 0 || i === events.length - 1) {
        await writeOutlookCalendarState({
          eventMap,
          lastSyncAt,
          lastSyncOrigin: request.origin,
        });
      }
    } catch (err) {
      verboseLog("[BetterSEQTA+] Outlook Calendar event sync failed:", err);
      failed += 1;
      reportProgress(options.onProgress, {
        phase: "upserting",
        current: staleEntries.length + i + 1,
        total: totalSteps,
        message: `Syncing events (${i + 1}/${events.length})…`,
      });
    }
  }

  if (staleResult.deleted > 0 || staleEntries.length > 0 || events.length > 0) {
    await writeOutlookCalendarState({
      eventMap,
      lastSyncAt,
      lastSyncOrigin: request.origin,
    });
  }

  reportProgress(options.onProgress, {
    phase: "done",
    current: totalSteps,
    total: totalSteps,
    message: "Sync complete",
  });

  return {
    success: failed === 0,
    configured: true,
    connected: true,
    created,
    updated,
    deleted: staleResult.deleted,
    skipped: 0,
    failed,
    lastSyncAt,
    error:
      failed > 0
        ? `Synced with ${failed} error${failed === 1 ? "" : "s"}. Check the console for details.`
        : undefined,
  };
}

export async function deleteSyncedEventsFromOutlookCalendar(
  origin: string,
  getAccessToken: () => Promise<string>,
  options: GoogleCalendarSyncOptions = {},
): Promise<GoogleCalendarDeleteResult> {
  if (!isOutlookCalendarConfigured()) {
    return {
      success: false,
      configured: false,
      error: "Outlook Calendar is not configured in this extension build.",
    };
  }

  const state = await readOutlookCalendarState();
  if (!state.refreshToken && !state.accessToken) {
    return { success: false, configured: true, connected: false, error: "Connect Outlook Calendar first." };
  }

  const entries = originEventMapEntries(state.eventMap ?? {}, origin);
  if (entries.length === 0) {
    return { success: true, configured: true, connected: true, deleted: 0, failed: 0 };
  }

  reportProgress(options.onProgress, {
    phase: "preparing",
    current: 0,
    total: entries.length,
    message: "Preparing removal…",
  });

  const eventMap = { ...(state.eventMap ?? {}) };
  const { deleted, failed } = await deleteTrackedEventsFromOutlook(
    entries,
    eventMap,
    getAccessToken,
    true,
    options.onProgress,
    0,
    entries.length,
  );

  await writeOutlookCalendarState({ eventMap });

  reportProgress(options.onProgress, {
    phase: "done",
    current: entries.length,
    total: entries.length,
    message: "Removal complete",
  });

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
