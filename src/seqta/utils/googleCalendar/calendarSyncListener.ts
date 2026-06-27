import browser from "webextension-polyfill";
import {
  markWeeklySyncComplete,
  shouldRunWeeklySync,
} from "@/seqta/utils/calendarSync/settings";
import {
  formatSyncResultMessage,
  runGoogleCalendarSync,
} from "@/seqta/utils/googleCalendar/syncRunner";
import {
  formatOutlookSyncResultMessage,
  runOutlookCalendarSync,
} from "@/seqta/utils/outlookCalendar/syncRunner";
import { readGoogleCalendarState } from "@/seqta/utils/googleCalendar/storage";
import { readOutlookCalendarState } from "@/seqta/utils/outlookCalendar/storage";
import type { GoogleCalendarSyncResult } from "@/seqta/utils/googleCalendar/types";

let listenerRegistered = false;

async function runWeeklySyncForConnectedProviders(): Promise<GoogleCalendarSyncResult[]> {
  const [google, outlook] = await Promise.all([
    readGoogleCalendarState(),
    readOutlookCalendarState(),
  ]);
  const results: GoogleCalendarSyncResult[] = [];

  if (google.refreshToken || google.accessToken) {
    results.push(await runGoogleCalendarSync({ mode: "incremental", silent: true }));
  }
  if (outlook.refreshToken || outlook.accessToken) {
    results.push(await runOutlookCalendarSync({ mode: "incremental", silent: true }));
  }

  if (results.some((r) => r.success)) {
    await markWeeklySyncComplete();
  }

  return results;
}

export function registerCalendarContentHandlers(): void {
  if (listenerRegistered) return;
  listenerRegistered = true;

  browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request?.type === "calendarRunWeeklySync" || request?.type === "googleCalendarRunWeeklySync") {
      void runWeeklySyncForConnectedProviders()
        .then((results) => sendResponse({ success: true, results }))
        .catch((err: unknown) => {
          sendResponse({
            success: false,
            error: err instanceof Error ? err.message : "Weekly sync failed",
          });
        });
      return true;
    }
    return false;
  });
}

export async function maybeRunDueWeeklySync(
  onComplete?: (message: string, isError?: boolean) => void,
): Promise<void> {
  if (!(await shouldRunWeeklySync())) return;

  const [google, outlook] = await Promise.all([
    readGoogleCalendarState(),
    readOutlookCalendarState(),
  ]);
  const results = await runWeeklySyncForConnectedProviders();
  if (!onComplete) return;

  const errors = results.filter((r) => !r.success);
  if (errors.length > 0) {
    onComplete(errors[0]?.error ?? "Weekly calendar sync failed.", true);
    return;
  }

  const messages: string[] = [];
  let index = 0;
  if (google.refreshToken || google.accessToken) {
    const result = results[index++];
    const changed =
      (result.created ?? 0) + (result.updated ?? 0) + (result.deleted ?? 0) > 0;
    if (changed) messages.push(formatSyncResultMessage(result));
  }
  if (outlook.refreshToken || outlook.accessToken) {
    const result = results[index++];
    const changed =
      (result.created ?? 0) + (result.updated ?? 0) + (result.deleted ?? 0) > 0;
    if (changed) messages.push(formatOutlookSyncResultMessage(result));
  }

  if (messages.length > 0) {
    onComplete(messages.join(" "));
  }
}

/** @deprecated use registerCalendarContentHandlers */
export const registerGoogleCalendarContentHandlers = registerCalendarContentHandlers;
