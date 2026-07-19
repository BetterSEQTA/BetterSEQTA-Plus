import browser from "webextension-polyfill";
import {
  markWeeklySyncComplete,
  shouldRunWeeklySync,
} from "@/seqta/utils/calendarSync/settings";
import { formatLessonSyncResultMessage } from "@/seqta/utils/calendarSync/lessonSyncShared";
import { runGoogleCalendarSync, runOutlookCalendarSync } from "@/seqta/utils/calendarSync/syncRunner";
import {
  readGoogleCalendarState,
  readOutlookCalendarState,
} from "@/seqta/utils/calendarSync/providerStorage";
import type { GoogleCalendarSyncResult } from "@/seqta/utils/googleCalendar/types";

let listenerRegistered = false;

const WEEKLY_PROVIDERS = [
  { label: "Google Calendar", read: readGoogleCalendarState, run: runGoogleCalendarSync },
  { label: "Outlook Calendar", read: readOutlookCalendarState, run: runOutlookCalendarSync },
] as const;

function isConnected(state: { refreshToken?: string; accessToken?: string }): boolean {
  return Boolean(state.refreshToken || state.accessToken);
}

function hadChanges(result: GoogleCalendarSyncResult): boolean {
  return (result.created ?? 0) + (result.updated ?? 0) + (result.deleted ?? 0) > 0;
}

async function runWeeklySyncForConnectedProviders(): Promise<
  Array<{ label: string; result: GoogleCalendarSyncResult }>
> {
  const results: Array<{ label: string; result: GoogleCalendarSyncResult }> = [];

  for (const provider of WEEKLY_PROVIDERS) {
    if (!isConnected(await provider.read())) continue;
    results.push({ label: provider.label, result: await provider.run({ mode: "incremental" }) });
  }

  if (results.some(({ result }) => result.success)) {
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

  const results = await runWeeklySyncForConnectedProviders();
  if (!onComplete) return;

  const failed = results.find(({ result }) => !result.success);
  if (failed) {
    onComplete(failed.result.error ?? "Weekly calendar sync failed.", true);
    return;
  }

  const messages = results
    .filter(({ result }) => hadChanges(result))
    .map(({ label, result }) => formatLessonSyncResultMessage(result, label));

  if (messages.length > 0) {
    onComplete(messages.join(" "));
  }
}
