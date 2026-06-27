import { verboseLog } from "@/utils/verboseLog";
import { isGoogleCalendarConfigured } from "@/config/googleCalendar";
import { googleApiEventBody, mapLessonsToGoogleEvents } from "@/seqta/utils/googleCalendar/eventMapper";
import { getSyncWeeksAhead } from "@/seqta/utils/calendarSync/settings";
import {
  buildLessonSyncResult,
  emptyLessonsSyncResult,
  entriesToPrune,
  EVENT_MAP_PERSIST_EVERY,
  notConfiguredSyncResult,
  notConnectedSyncResult,
  originEventMapEntries,
  persistFinalSyncState,
  reportSyncProgress,
  upsertLessonEvents,
} from "@/seqta/utils/calendarSync/lessonSyncShared";
import {
  eventMapKey,
  readGoogleCalendarState,
  writeGoogleCalendarState,
} from "@/seqta/utils/googleCalendar/storage";
import type {
  GoogleCalendarDeleteResult,
  GoogleCalendarSyncOptions,
  GoogleCalendarSyncRequest,
  GoogleCalendarSyncResult,
} from "@/seqta/utils/googleCalendar/types";
import {
  deleteGoogleCalendarEvent,
  upsertGoogleCalendarEvent,
} from "@/seqta/utils/googleCalendar/upsertEvent";

const CALENDAR_ID = "primary";

type DeleteTrackedEventsResult = {
  deleted: number;
  failed: number;
};

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

      reportSyncProgress(onProgress, {
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
      reportSyncProgress(onProgress, {
        phase: "deleting",
        current: progressOffset + deleted + failed,
        total: progressTotal,
        message: `Removing old events (${deleted + failed}/${entries.length})…`,
      });
    }
  }

  return { deleted, failed };
}

/** Runs in the content script tab so long syncs are not killed by the MV3 service worker. */
export async function syncLessonsToGoogleCalendar(
  request: GoogleCalendarSyncRequest,
  getAccessToken: () => Promise<string>,
  options: GoogleCalendarSyncOptions = {},
): Promise<GoogleCalendarSyncResult> {
  if (!isGoogleCalendarConfigured()) {
    return notConfiguredSyncResult(
      "Google Calendar is not configured in this extension build.",
    );
  }

  const state = await readGoogleCalendarState();
  if (!state.refreshToken && !state.accessToken) {
    return notConnectedSyncResult("Connect Google Calendar first.");
  }

  const mode = request.mode ?? "full";
  const weeksAhead = request.weeksAhead ?? (await getSyncWeeksAhead());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const events = mapLessonsToGoogleEvents(request.origin, request.lessons, timeZone);

  if (events.length === 0 && mode === "full") {
    return emptyLessonsSyncResult();
  }

  reportSyncProgress(options.onProgress, {
    phase: "preparing",
    current: 0,
    total: Math.max(events.length, 1),
    message: mode === "incremental" ? "Preparing weekly sync…" : "Preparing sync…",
  });

  const eventMap = { ...(state.eventMap ?? {}) };
  const currentMapKeys = new Set(events.map((event) => eventMapKey(request.origin, event.seqtaKey)));
  const staleEntries = entriesToPrune(eventMap, request.origin, mode, weeksAhead, currentMapKeys);
  const totalSteps = staleEntries.length + events.length;
  const lastSyncAt = Date.now();

  const staleResult = await deleteTrackedEventsFromGoogle(
    staleEntries,
    eventMap,
    getAccessToken,
    false,
    options.onProgress,
    0,
    totalSteps,
  );

  const upsertResult = await upsertLessonEvents({
    events,
    eventMap,
    origin: request.origin,
    staleEntryCount: staleEntries.length,
    totalSteps,
    lastSyncAt,
    initialFailed: staleResult.failed,
    getAccessToken,
    mapKey: eventMapKey,
    upsert: (accessToken, existingId, event, refreshAccessToken) =>
      upsertGoogleCalendarEvent(
        accessToken,
        CALENDAR_ID,
        existingId,
        googleApiEventBody(event),
        refreshAccessToken,
      ),
    writeState: writeGoogleCalendarState,
    onProgress: options.onProgress,
    logLabel: "Google Calendar",
  });

  await persistFinalSyncState(
    writeGoogleCalendarState,
    eventMap,
    lastSyncAt,
    request.origin,
    staleResult.deleted,
    staleEntries.length,
    events.length,
  );

  reportSyncProgress(options.onProgress, {
    phase: "done",
    current: totalSteps,
    total: totalSteps,
    message: "Sync complete",
  });

  return buildLessonSyncResult(
    upsertResult.created,
    upsertResult.updated,
    staleResult.deleted,
    upsertResult.failed,
    lastSyncAt,
  );
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

  reportSyncProgress(options.onProgress, {
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

  reportSyncProgress(options.onProgress, {
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
