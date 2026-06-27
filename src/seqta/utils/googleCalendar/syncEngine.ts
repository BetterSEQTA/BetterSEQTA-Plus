import { verboseLog } from "@/utils/verboseLog";
import { isGoogleCalendarConfigured } from "@/config/googleCalendar";
import { googleApiEventBody, mapLessonsToGoogleEvents } from "@/seqta/utils/googleCalendar/eventMapper";
import {
  getStoredEventId,
  lessonDateFromSeqtaKey,
  normalizeEventMapEntry,
} from "@/seqta/utils/googleCalendar/eventMapEntry";
import {
  isDateInRange,
  syncWindowRange,
} from "@/seqta/utils/googleCalendar/syncDateRange";
import { getSyncWeeksAhead } from "@/seqta/utils/googleCalendar/syncSettings";
import {
  eventMapKey,
  readGoogleCalendarState,
  writeGoogleCalendarState,
} from "@/seqta/utils/googleCalendar/storage";
import type {
  GoogleCalendarDeleteResult,
  GoogleCalendarSyncOptions,
  GoogleCalendarSyncProgress,
  GoogleCalendarSyncRequest,
  GoogleCalendarSyncResult,
} from "@/seqta/utils/googleCalendar/types";
import {
  deleteGoogleCalendarEvent,
  upsertGoogleCalendarEvent,
} from "@/seqta/utils/googleCalendar/upsertEvent";

const EVENT_MAP_PERSIST_EVERY = 10;
const CALENDAR_ID = "primary";

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

async function deleteTrackedEventsFromGoogle(
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

  for (let i = 0; i < entries.length; i++) {
    const [mapKey, eventId] = entries[i];
    try {
      await deleteGoogleCalendarEvent(accessToken, CALENDAR_ID, eventId, async () => {
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
        await writeGoogleCalendarState({ eventMap });
      }
    } catch (err) {
      verboseLog("[BetterSEQTA+] Google Calendar event delete failed:", err);
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

/** Runs in the content script tab so long syncs are not killed by the MV3 service worker. */
export async function syncLessonsToGoogleCalendar(
  request: GoogleCalendarSyncRequest,
  getAccessToken: () => Promise<string>,
  options: GoogleCalendarSyncOptions = {},
): Promise<GoogleCalendarSyncResult> {
  if (!isGoogleCalendarConfigured()) {
    return {
      success: false,
      configured: false,
      error: "Google Calendar is not configured in this extension build.",
    };
  }

  const state = await readGoogleCalendarState();
  if (!state.refreshToken && !state.accessToken) {
    return { success: false, configured: true, connected: false, error: "Connect Google Calendar first." };
  }

  const mode = request.mode ?? "full";
  const weeksAhead = request.weeksAhead ?? (await getSyncWeeksAhead());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const events = mapLessonsToGoogleEvents(request.origin, request.lessons, timeZone);

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
  const currentMapKeys = new Set(events.map((event) => eventMapKey(request.origin, event.seqtaKey)));
  const staleEntries = entriesToPrune(eventMap, request.origin, mode, weeksAhead, currentMapKeys);
  const totalSteps = staleEntries.length + events.length;

  const staleResult = await deleteTrackedEventsFromGoogle(
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
    const mapKey = eventMapKey(request.origin, event.seqtaKey);
    const existingId = getStoredEventId(eventMap[mapKey]);
    try {
      const googleId = await upsertGoogleCalendarEvent(
        accessToken,
        CALENDAR_ID,
        existingId,
        googleApiEventBody(event),
        async () => {
          accessToken = await getAccessToken();
          return accessToken;
        },
      );
      if (existingId) updated += 1;
      else created += 1;
      eventMap[mapKey] = {
        id: googleId,
        date: lessonDateForEvent(event.startDateTime, event.seqtaKey),
      };

      reportProgress(options.onProgress, {
        phase: "upserting",
        current: staleEntries.length + i + 1,
        total: totalSteps,
        message: `Syncing events (${i + 1}/${events.length})…`,
      });

      if ((i + 1) % EVENT_MAP_PERSIST_EVERY === 0 || i === events.length - 1) {
        await writeGoogleCalendarState({
          eventMap,
          lastSyncAt,
          lastSyncOrigin: request.origin,
        });
      }
    } catch (err) {
      verboseLog("[BetterSEQTA+] Google Calendar event sync failed:", err);
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
    await writeGoogleCalendarState({
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

/** Delete all tracked BetterSEQTA+ events for this SEQTA origin from Google Calendar. */
export async function deleteSyncedEventsFromGoogleCalendar(
  origin: string,
  getAccessToken: () => Promise<string>,
  options: GoogleCalendarSyncOptions = {},
): Promise<GoogleCalendarDeleteResult> {
  if (!isGoogleCalendarConfigured()) {
    return {
      success: false,
      configured: false,
      error: "Google Calendar is not configured in this extension build.",
    };
  }

  const state = await readGoogleCalendarState();
  if (!state.refreshToken && !state.accessToken) {
    return { success: false, configured: true, connected: false, error: "Connect Google Calendar first." };
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
  const { deleted, failed } = await deleteTrackedEventsFromGoogle(
    entries,
    eventMap,
    getAccessToken,
    true,
    options.onProgress,
    0,
    entries.length,
  );

  await writeGoogleCalendarState({ eventMap });

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
