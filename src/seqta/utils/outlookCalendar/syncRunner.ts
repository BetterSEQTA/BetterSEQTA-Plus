import browser from "webextension-polyfill";
import {
  fetchTimetableForSync,
  fetchTimetableLessons,
  trailingWeekRange,
} from "@/seqta/utils/googleCalendar/fetchTimetable";
import { getSyncWeeksAhead } from "@/seqta/utils/calendarSync/settings";
import { reportSyncProgress } from "@/seqta/utils/calendarSync/lessonSyncShared";
import { syncLessonsToOutlookCalendar } from "@/seqta/utils/outlookCalendar/syncEngine";
import type {
  GoogleCalendarSyncOptions,
  GoogleCalendarSyncProgress,
  GoogleCalendarSyncResult,
} from "@/seqta/utils/googleCalendar/types";

export type OutlookCalendarRunMode = "full" | "incremental";

export interface RunOutlookCalendarSyncParams {
  mode?: OutlookCalendarRunMode;
  silent?: boolean;
  onProgress?: (progress: GoogleCalendarSyncProgress) => void;
}

async function getAccessTokenFromBackground(): Promise<string> {
  const res = (await browser.runtime.sendMessage({
    type: "outlookCalendarGetAccessToken",
  })) as { success?: boolean; accessToken?: string; error?: string };
  if (!res?.success || !res.accessToken) {
    throw new Error(res?.error ?? "Could not get Outlook Calendar access token.");
  }
  return res.accessToken;
}

export async function runOutlookCalendarSync(
  params: RunOutlookCalendarSyncParams = {},
): Promise<GoogleCalendarSyncResult> {
  const mode = params.mode ?? "full";
  const weeksAhead = await getSyncWeeksAhead();

  reportSyncProgress(params.onProgress, {
    phase: "preparing",
    current: 0,
    total: 1,
    message: mode === "incremental" ? "Fetching new week…" : "Fetching timetable…",
  });

  const lessons =
    mode === "incremental"
      ? await fetchTimetableLessons(trailingWeekRange(weeksAhead))
      : await fetchTimetableForSync(weeksAhead);

  const options: GoogleCalendarSyncOptions = { onProgress: params.onProgress };
  const result = await syncLessonsToOutlookCalendar(
    {
      origin: location.origin,
      lessons,
      mode,
      weeksAhead,
    },
    getAccessTokenFromBackground,
    options,
  );

  return result;
}

export function formatOutlookSyncResultMessage(result: GoogleCalendarSyncResult): string {
  const created = result.created ?? 0;
  const updated = result.updated ?? 0;
  const deleted = result.deleted ?? 0;
  const parts: string[] = [];
  if (created > 0) parts.push(`${created} new`);
  if (updated > 0) parts.push(`${updated} updated`);
  if (deleted > 0) parts.push(`${deleted} removed`);
  if (parts.length === 0) return "Outlook Calendar is up to date.";
  return `Outlook Calendar updated (${parts.join(", ")}).`;
}
