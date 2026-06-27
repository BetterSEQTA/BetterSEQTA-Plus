import { verboseLog } from "@/utils/verboseLog";
import { isOutlookCalendarConfigured } from "@/config/outlookCalendar";
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
import type {
  GoogleCalendarDeleteResult,
  GoogleCalendarSyncOptions,
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

type DeleteTrackedEventsResult = {
  deleted: number;
  failed: number;
};

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

      reportSyncProgress(onProgress, {
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

export async function syncLessonsToOutlookCalendar(
  request: GoogleCalendarSyncRequest,
  getAccessToken: () => Promise<string>,
  options: GoogleCalendarSyncOptions = {},
): Promise<GoogleCalendarSyncResult> {
  if (!isOutlookCalendarConfigured()) {
    return notConfiguredSyncResult(
      "Outlook Calendar is not configured in this extension build.",
    );
  }

  const state = await readOutlookCalendarState();
  if (!state.refreshToken && !state.accessToken) {
    return notConnectedSyncResult("Connect Outlook Calendar first.");
  }

  const mode = request.mode ?? "full";
  const weeksAhead = request.weeksAhead ?? (await getSyncWeeksAhead());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const events = mapLessonsToOutlookEvents(request.origin, request.lessons, timeZone);

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
  const currentMapKeys = new Set(
    events.map((event) => outlookEventMapKey(request.origin, event.seqtaKey)),
  );
  const staleEntries = entriesToPrune(eventMap, request.origin, mode, weeksAhead, currentMapKeys);
  const totalSteps = staleEntries.length + events.length;
  const lastSyncAt = Date.now();

  const staleResult = await deleteTrackedEventsFromOutlook(
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
    mapKey: outlookEventMapKey,
    upsert: (accessToken, existingId, event, refreshAccessToken) =>
      upsertOutlookCalendarEvent(
        accessToken,
        existingId,
        outlookGraphEventBody(event),
        refreshAccessToken,
      ),
    writeState: writeOutlookCalendarState,
    onProgress: options.onProgress,
    logLabel: "Outlook Calendar",
  });

  await persistFinalSyncState(
    writeOutlookCalendarState,
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

  reportSyncProgress(options.onProgress, {
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
