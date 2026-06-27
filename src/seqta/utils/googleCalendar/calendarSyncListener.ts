import browser from "webextension-polyfill";
import { shouldRunWeeklySync } from "@/seqta/utils/googleCalendar/syncSettings";
import {
  formatSyncResultMessage,
  runGoogleCalendarSync,
} from "@/seqta/utils/googleCalendar/syncRunner";
import type { GoogleCalendarSyncResult } from "@/seqta/utils/googleCalendar/types";

let listenerRegistered = false;

export function registerGoogleCalendarContentHandlers(): void {
  if (listenerRegistered) return;
  listenerRegistered = true;

  browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request?.type !== "googleCalendarRunWeeklySync") return false;
    void runGoogleCalendarSync({ mode: "incremental", silent: true })
      .then((result: GoogleCalendarSyncResult) => sendResponse(result))
      .catch((err: unknown) => {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Weekly sync failed",
        });
      });
    return true;
  });
}

export async function maybeRunDueWeeklySync(
  onComplete?: (message: string, isError?: boolean) => void,
): Promise<void> {
  if (!(await shouldRunWeeklySync())) return;

  const result = await runGoogleCalendarSync({ mode: "incremental", silent: true });
  if (!onComplete) return;

  if (!result.success) {
    onComplete(result.error ?? "Weekly calendar sync failed.", true);
    return;
  }

  const changed =
    (result.created ?? 0) + (result.updated ?? 0) + (result.deleted ?? 0) > 0;
  if (changed) {
    onComplete(formatSyncResultMessage(result));
  }
}
