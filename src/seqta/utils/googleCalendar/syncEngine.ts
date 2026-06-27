import { verboseLog } from "@/utils/verboseLog";
import { isGoogleCalendarConfigured } from "@/config/googleCalendar";
import { googleApiEventBody, mapLessonsToGoogleEvents } from "@/seqta/utils/googleCalendar/eventMapper";
import {
  eventMapKey,
  readGoogleCalendarState,
  writeGoogleCalendarState,
} from "@/seqta/utils/googleCalendar/storage";
import type { GoogleCalendarSyncRequest, GoogleCalendarSyncResult } from "@/seqta/utils/googleCalendar/types";
import { upsertGoogleCalendarEvent } from "@/seqta/utils/googleCalendar/upsertEvent";

const EVENT_MAP_PERSIST_EVERY = 10;

/** Runs in the content script tab so long syncs are not killed by the MV3 service worker. */
export async function syncLessonsToGoogleCalendar(
  request: GoogleCalendarSyncRequest,
  getAccessToken: () => Promise<string>,
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

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const events = mapLessonsToGoogleEvents(request.origin, request.lessons, timeZone);
  if (events.length === 0) {
    return {
      success: false,
      configured: true,
      connected: true,
      error: "No timetable classes found to sync for the selected range.",
    };
  }

  let accessToken = await getAccessToken();
  const calendarId = "primary";
  const eventMap = { ...(state.eventMap ?? {}) };

  let created = 0;
  let updated = 0;
  let failed = 0;
  const lastSyncAt = Date.now();

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const mapKey = eventMapKey(request.origin, event.seqtaKey);
    const existingId = eventMap[mapKey];
    try {
      const googleId = await upsertGoogleCalendarEvent(
        accessToken,
        calendarId,
        existingId,
        googleApiEventBody(event),
        async () => {
          accessToken = await getAccessToken();
          return accessToken;
        },
      );
      if (existingId) updated += 1;
      else created += 1;
      eventMap[mapKey] = googleId;

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
    }
  }

  const syncResult: GoogleCalendarSyncResult = {
    success: failed === 0,
    configured: true,
    connected: true,
    created,
    updated,
    skipped: 0,
    failed,
    lastSyncAt,
    error:
      failed > 0
        ? `Synced with ${failed} error${failed === 1 ? "" : "s"}. Check the console for details.`
        : undefined,
  };

  return syncResult;
}
