import { isGoogleCalendarConfigured } from "@/config/googleCalendar";
import { isOutlookCalendarConfigured } from "@/config/outlookCalendar";
import { getSyncWeeksAhead } from "@/seqta/utils/calendarSync/settings";
import { eventMapKey } from "@/seqta/utils/calendarSync/eventMap";
import type { EventMapRecord } from "@/seqta/utils/calendarSync/eventMap";
import {
  buildDeleteSyncResult,
  buildLessonSyncResult,
  deleteTrackedLessonEvents,
  emptyLessonsSyncResult,
  entriesToPrune,
  notConfiguredSyncResult,
  notConnectedSyncResult,
  originEventMapEntries,
  reportSyncProgress,
  upsertLessonEvents,
} from "@/seqta/utils/calendarSync/lessonSyncShared";
import { googleApiEventBody, mapLessonsToGoogleEvents, outlookGraphEventBody } from "@/seqta/utils/googleCalendar/eventMapper";
import {
  readGoogleCalendarState,
  writeGoogleCalendarState,
} from "@/seqta/utils/googleCalendar/storage";
import type {
  GoogleCalendarDeleteResult,
  GoogleCalendarEventInput,
  GoogleCalendarSyncOptions,
  GoogleCalendarSyncRequest,
  GoogleCalendarSyncResult,
} from "@/seqta/utils/googleCalendar/types";
import {
  deleteGoogleCalendarEvent,
  deleteOutlookCalendarEvent,
  upsertGoogleCalendarEvent,
  upsertOutlookCalendarEvent,
} from "@/seqta/utils/calendarSync/remoteEvents";
import { ensureGoogleAppCalendar } from "@/seqta/utils/googleCalendar/calendarProvisioning";
import {
  readOutlookCalendarState,
  writeOutlookCalendarState,
} from "@/seqta/utils/outlookCalendar/storage";

type CalendarStoredState = {
  refreshToken?: string;
  accessToken?: string;
  eventMap?: EventMapRecord;
};

export type CalendarLessonSyncProvider = {
  label: string;
  isConfigured: () => boolean;
  notConfiguredError: string;
  notConnectedError: string;
  readState: () => Promise<CalendarStoredState>;
  writeState: (patch: {
    eventMap?: EventMapRecord;
    lastSyncAt?: number;
    lastSyncOrigin?: string;
  }) => Promise<unknown>;
  deleteEvent: (
    accessToken: string,
    eventId: string,
    refreshAccessToken: () => Promise<string>,
  ) => Promise<void>;
  upsertEvent: (
    accessToken: string,
    existingId: string | undefined,
    body: Record<string, unknown>,
    refreshAccessToken: () => Promise<string>,
  ) => Promise<string>;
  toApiBody: (event: GoogleCalendarEventInput) => Record<string, unknown>;
};

async function getOrProvisionGoogleCalendarId(accessToken: string): Promise<string> {
  const state = await readGoogleCalendarState();
  if (state.calendarId) return state.calendarId;

  const calendarId = await ensureGoogleAppCalendar(accessToken);
  await writeGoogleCalendarState({ calendarId });
  return calendarId;
}

export const googleLessonSyncProvider: CalendarLessonSyncProvider = {
  label: "Google Calendar",
  isConfigured: isGoogleCalendarConfigured,
  notConfiguredError: "Google Calendar is not configured in this extension build.",
  notConnectedError: "Connect Google Calendar first.",
  readState: readGoogleCalendarState,
  writeState: writeGoogleCalendarState,
  deleteEvent: async (accessToken, eventId, refreshAccessToken) =>
    deleteGoogleCalendarEvent(
      accessToken,
      await getOrProvisionGoogleCalendarId(accessToken),
      eventId,
      refreshAccessToken,
    ),
  upsertEvent: async (accessToken, existingId, body, refreshAccessToken) =>
    upsertGoogleCalendarEvent(
      accessToken,
      await getOrProvisionGoogleCalendarId(accessToken),
      existingId,
      body,
      refreshAccessToken,
    ),
  toApiBody: googleApiEventBody,
};

export const outlookLessonSyncProvider: CalendarLessonSyncProvider = {
  label: "Outlook Calendar",
  isConfigured: isOutlookCalendarConfigured,
  notConfiguredError: "Outlook Calendar is not configured in this extension build.",
  notConnectedError: "Connect Outlook Calendar first.",
  readState: readOutlookCalendarState,
  writeState: writeOutlookCalendarState,
  deleteEvent: (accessToken, eventId, refreshAccessToken) =>
    deleteOutlookCalendarEvent(accessToken, eventId, refreshAccessToken),
  upsertEvent: (accessToken, existingId, body, refreshAccessToken) =>
    upsertOutlookCalendarEvent(accessToken, existingId, body, refreshAccessToken),
  toApiBody: outlookGraphEventBody,
};

/** Runs in the content script tab so long syncs are not killed by the MV3 service worker. */
export async function syncLessonsToCalendar(
  provider: CalendarLessonSyncProvider,
  request: GoogleCalendarSyncRequest,
  getAccessToken: () => Promise<string>,
  options: GoogleCalendarSyncOptions = {},
): Promise<GoogleCalendarSyncResult> {
  if (!provider.isConfigured()) {
    return notConfiguredSyncResult(provider.notConfiguredError);
  }

  const state = await provider.readState();
  if (!state.refreshToken && !state.accessToken) {
    return notConnectedSyncResult(provider.notConnectedError);
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

  const staleResult = await deleteTrackedLessonEvents(
    staleEntries,
    eventMap,
    getAccessToken,
    provider.deleteEvent,
    provider.writeState,
    {
      onProgress: options.onProgress,
      progressTotal: totalSteps,
      logLabel: provider.label,
    },
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
      provider.upsertEvent(
        accessToken,
        existingId,
        provider.toApiBody(event),
        refreshAccessToken,
      ),
    writeState: provider.writeState,
    onProgress: options.onProgress,
    logLabel: provider.label,
  });

  if (staleResult.deleted > 0 || staleEntries.length > 0 || events.length > 0) {
    await provider.writeState({
      eventMap,
      lastSyncAt,
      lastSyncOrigin: request.origin,
    });
  }

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

/** Delete all tracked BetterSEQTA+ events for this SEQTA origin from the provider calendar. */
export async function deleteSyncedEventsFromCalendar(
  provider: CalendarLessonSyncProvider,
  origin: string,
  getAccessToken: () => Promise<string>,
  options: GoogleCalendarSyncOptions = {},
): Promise<GoogleCalendarDeleteResult> {
  if (!provider.isConfigured()) {
    return {
      success: false,
      configured: false,
      error: provider.notConfiguredError,
    };
  }

  const state = await provider.readState();
  if (!state.refreshToken && !state.accessToken) {
    return { success: false, configured: true, connected: false, error: provider.notConnectedError };
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
  const { deleted, failed } = await deleteTrackedLessonEvents(
    entries,
    eventMap,
    getAccessToken,
    provider.deleteEvent,
    provider.writeState,
    {
      persistProgress: true,
      onProgress: options.onProgress,
      progressTotal: entries.length,
      logLabel: provider.label,
    },
  );

  await provider.writeState({ eventMap });

  reportSyncProgress(options.onProgress, {
    phase: "done",
    current: entries.length,
    total: entries.length,
    message: "Removal complete",
  });

  return buildDeleteSyncResult(deleted, failed);
}

export const syncLessonsToGoogleCalendar = (
  request: GoogleCalendarSyncRequest,
  getAccessToken: () => Promise<string>,
  options?: GoogleCalendarSyncOptions,
) => syncLessonsToCalendar(googleLessonSyncProvider, request, getAccessToken, options);

export const deleteSyncedEventsFromGoogleCalendar = (
  origin: string,
  getAccessToken: () => Promise<string>,
  options?: GoogleCalendarSyncOptions,
) => deleteSyncedEventsFromCalendar(googleLessonSyncProvider, origin, getAccessToken, options);

export const syncLessonsToOutlookCalendar = (
  request: GoogleCalendarSyncRequest,
  getAccessToken: () => Promise<string>,
  options?: GoogleCalendarSyncOptions,
) => syncLessonsToCalendar(outlookLessonSyncProvider, request, getAccessToken, options);

export const deleteSyncedEventsFromOutlookCalendar = (
  origin: string,
  getAccessToken: () => Promise<string>,
  options?: GoogleCalendarSyncOptions,
) => deleteSyncedEventsFromCalendar(outlookLessonSyncProvider, origin, getAccessToken, options);
