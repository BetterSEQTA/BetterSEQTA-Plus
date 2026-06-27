import type { GoogleCalendarSyncResult } from "@/seqta/utils/googleCalendar/types";
import { formatSyncResultMessage } from "@/seqta/utils/googleCalendar/syncRunner";
import { formatOutlookSyncResultMessage } from "@/seqta/utils/outlookCalendar/syncRunner";

type ProviderCalendarState = {
  refreshToken?: string;
  accessToken?: string;
};

function isProviderConnected(state: ProviderCalendarState): boolean {
  return Boolean(state.refreshToken || state.accessToken);
}

function providerHadChanges(result: GoogleCalendarSyncResult): boolean {
  return (
    (result.created ?? 0) + (result.updated ?? 0) + (result.deleted ?? 0) > 0
  );
}

export function weeklySyncErrorMessage(
  results: GoogleCalendarSyncResult[],
): string | undefined {
  const failed = results.find((result) => !result.success);
  if (!failed) return undefined;
  return failed.error ?? "Weekly calendar sync failed.";
}

export function formatWeeklySyncMessages(
  google: ProviderCalendarState,
  outlook: ProviderCalendarState,
  results: GoogleCalendarSyncResult[],
): string[] {
  const messages: string[] = [];
  let index = 0;

  if (isProviderConnected(google)) {
    const result = results[index++];
    if (result && providerHadChanges(result)) {
      messages.push(formatSyncResultMessage(result));
    }
  }

  if (isProviderConnected(outlook)) {
    const result = results[index++];
    if (result && providerHadChanges(result)) {
      messages.push(formatOutlookSyncResultMessage(result));
    }
  }

  return messages;
}
