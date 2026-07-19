import browser from "webextension-polyfill";
import { fetchTimetableForSync, fetchTimetableLessons } from "@/seqta/utils/googleCalendar/fetchTimetable";
import { trailingWeekRange } from "@/seqta/utils/googleCalendar/syncDateRange";
import {
  googleLessonSyncProvider,
  outlookLessonSyncProvider,
  syncLessonsToCalendar,
  type CalendarLessonSyncProvider,
} from "@/seqta/utils/calendarSync/syncEngine";
import { reportSyncProgress } from "@/seqta/utils/calendarSync/lessonSyncShared";
import type { OutlookCalendarStatus } from "@/seqta/utils/calendarSync/providerStorage";
import { getSyncWeeksAhead } from "@/seqta/utils/calendarSync/settings";
import type {
  GoogleCalendarStatus,
  GoogleCalendarSyncProgress,
  GoogleCalendarSyncResult,
} from "@/seqta/utils/googleCalendar/types";

export type CalendarProvider = "google" | "outlook";

const MSG = {
  accessToken: { google: "googleCalendarGetAccessToken", outlook: "outlookCalendarGetAccessToken" },
  connect: { google: "googleCalendarConnect", outlook: "outlookCalendarConnect" },
  disconnect: { google: "googleCalendarDisconnect", outlook: "outlookCalendarDisconnect" },
  status: { google: "googleCalendarStatus", outlook: "outlookCalendarStatus" },
} as const;

async function sendMessage<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
  return browser.runtime.sendMessage({ type, ...payload }) as Promise<T>;
}

export async function getCalendarAccessToken(provider: CalendarProvider): Promise<string> {
  const res = await sendMessage<{
    success?: boolean;
    accessToken?: string;
    error?: string;
  }>(MSG.accessToken[provider]);
  if (!res?.success || !res.accessToken) {
    throw new Error(res?.error ?? "Could not get calendar access token.");
  }
  return res.accessToken;
}

export async function fetchCalendarStatuses(): Promise<{
  google: GoogleCalendarStatus;
  outlook: OutlookCalendarStatus;
}> {
  const [google, outlook] = await Promise.all([
    sendMessage<GoogleCalendarStatus>(MSG.status.google),
    sendMessage<OutlookCalendarStatus>(MSG.status.outlook),
  ]);
  return { google, outlook };
}

export async function updateGoogleSyncSettings(patch: {
  syncWeeksAhead?: number;
  autoSyncWeekly?: boolean;
}): Promise<GoogleCalendarStatus & { success?: boolean }> {
  return sendMessage("googleCalendarUpdateSyncSettings", patch);
}

export async function connectCalendarProvider(
  provider: CalendarProvider,
): Promise<GoogleCalendarSyncResult> {
  return sendMessage(MSG.connect[provider]);
}

export async function disconnectCalendarProvider(
  provider: CalendarProvider,
): Promise<{ success?: boolean }> {
  return sendMessage(MSG.disconnect[provider]);
}

export interface RunCalendarSyncParams {
  mode?: "full" | "incremental";
  onProgress?: (progress: GoogleCalendarSyncProgress) => void;
}

type CalendarSyncRunnerConfig = {
  provider: CalendarProvider;
  lessonSyncProvider: CalendarLessonSyncProvider;
};

const GOOGLE_SYNC_RUNNER: CalendarSyncRunnerConfig = {
  provider: "google",
  lessonSyncProvider: googleLessonSyncProvider,
};

const OUTLOOK_SYNC_RUNNER: CalendarSyncRunnerConfig = {
  provider: "outlook",
  lessonSyncProvider: outlookLessonSyncProvider,
};

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
    () => getCalendarAccessToken(config.provider),
    { onProgress: params.onProgress },
  );
}

export const runGoogleCalendarSync = (params?: RunCalendarSyncParams) =>
  runCalendarSync(GOOGLE_SYNC_RUNNER, params);

export const runOutlookCalendarSync = (params?: RunCalendarSyncParams) =>
  runCalendarSync(OUTLOOK_SYNC_RUNNER, params);
