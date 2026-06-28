import browser from "webextension-polyfill";
import { fetchTimetableForSync, fetchTimetableLessons } from "@/seqta/utils/googleCalendar/fetchTimetable";
import { trailingWeekRange } from "@/seqta/utils/googleCalendar/syncDateRange";
import { getSyncWeeksAhead } from "@/seqta/utils/calendarSync/settings";
import { reportSyncProgress } from "@/seqta/utils/calendarSync/lessonSyncShared";
import {
  googleLessonSyncProvider,
  outlookLessonSyncProvider,
  syncLessonsToCalendar,
  type CalendarLessonSyncProvider,
} from "@/seqta/utils/calendarSync/syncEngine";
import type {
  GoogleCalendarSyncProgress,
  GoogleCalendarSyncResult,
} from "@/seqta/utils/googleCalendar/types";

export interface RunCalendarSyncParams {
  mode?: "full" | "incremental";
  onProgress?: (progress: GoogleCalendarSyncProgress) => void;
}

type CalendarSyncRunnerConfig = {
  accessTokenMessageType: string;
  accessTokenError: string;
  lessonSyncProvider: CalendarLessonSyncProvider;
};

const GOOGLE_SYNC_RUNNER: CalendarSyncRunnerConfig = {
  accessTokenMessageType: "googleCalendarGetAccessToken",
  accessTokenError: "Could not get Google Calendar access token.",
  lessonSyncProvider: googleLessonSyncProvider,
};

const OUTLOOK_SYNC_RUNNER: CalendarSyncRunnerConfig = {
  accessTokenMessageType: "outlookCalendarGetAccessToken",
  accessTokenError: "Could not get Outlook Calendar access token.",
  lessonSyncProvider: outlookLessonSyncProvider,
};

async function getAccessTokenFromBackground(
  messageType: string,
  errorMessage: string,
): Promise<string> {
  const res = (await browser.runtime.sendMessage({ type: messageType })) as {
    success?: boolean;
    accessToken?: string;
    error?: string;
  };
  if (!res?.success || !res.accessToken) {
    throw new Error(res?.error ?? errorMessage);
  }
  return res.accessToken;
}

export async function runCalendarSync(
  config: CalendarSyncRunnerConfig,
  params: RunCalendarSyncParams = {},
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

  return syncLessonsToCalendar(
    config.lessonSyncProvider,
    { origin: location.origin, lessons, mode, weeksAhead },
    () => getAccessTokenFromBackground(config.accessTokenMessageType, config.accessTokenError),
    { onProgress: params.onProgress },
  );
}

export const runGoogleCalendarSync = (params?: RunCalendarSyncParams) =>
  runCalendarSync(GOOGLE_SYNC_RUNNER, params);

export const runOutlookCalendarSync = (params?: RunCalendarSyncParams) =>
  runCalendarSync(OUTLOOK_SYNC_RUNNER, params);
