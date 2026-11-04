import browser from "@/lib/browser";
import {
  fetchAssessmentsForCalendarSync,
  fetchTimetableForSync,
  fetchTimetableLessons,
} from "@/seqta/utils/googleCalendar/fetchTimetable";
import { syncWindowRange, trailingWeekRange } from "@/seqta/utils/googleCalendar/syncDateRange";
import {
  googleLessonSyncProvider,
  outlookLessonSyncProvider,
  syncLessonsToCalendar,
  type CalendarLessonSyncProvider,
} from "@/seqta/utils/calendarSync/syncEngine";
import { reportSyncProgress } from "@/seqta/utils/calendarSync/lessonSyncShared";
import type { OutlookCalendarStatus } from "@/seqta/utils/calendarSync/providerStorage";
import {
  readGoogleCalendarState,
  readOutlookCalendarState,
} from "@/seqta/utils/calendarSync/providerStorage";
import {
  CALENDAR_SYNC_HEARTBEAT_MS,
  calendarSyncInProgressStorageKey,
  clearCalendarSyncInProgressMarker,
  getSyncAssessmentDueDates,
  getSyncWeeksAhead,
  isCalendarSyncRunningElsewhere,
  readResumableCalendarSync,
  releaseCalendarSyncLock,
  tryAcquireCalendarSyncLock,
  type CalendarSyncProvider,
} from "@/seqta/utils/calendarSync/settings";
import type {
  GoogleCalendarStatus,
  GoogleCalendarSyncProgress,
  GoogleCalendarSyncResult,
} from "@/seqta/utils/googleCalendar/types";

export type { CalendarSyncProvider as CalendarProvider };

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
  syncAssessmentDueDates?: boolean;
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

/** In-flight syncs for this tab; overlapping syncs each create every event, duplicating them. */
const activeSyncs = new Map<CalendarProvider, Promise<GoogleCalendarSyncResult>>();

export function runCalendarSync(
  config: CalendarSyncRunnerConfig,
  params: RunCalendarSyncParams = {},
): Promise<GoogleCalendarSyncResult> {
  const active = activeSyncs.get(config.provider);
  if (active) return active;
  const run = runExclusiveCalendarSync(config, params).finally(() => {
    activeSyncs.delete(config.provider);
  });
  activeSyncs.set(config.provider, run);
  return run;
}

async function runExclusiveCalendarSync(
  config: CalendarSyncRunnerConfig,
  params: RunCalendarSyncParams,
): Promise<GoogleCalendarSyncResult> {
  const mode = params.mode ?? "full";
  const lock = await tryAcquireCalendarSyncLock(config.provider, mode);
  if (!lock.acquired) {
    return {
      success: false,
      error: "A calendar sync is already running in another SEQTA tab. Try again in a minute.",
    };
  }

  const { lockId, marker } = lock;
  const storageKey = calendarSyncInProgressStorageKey(config.provider);
  const weeksAhead = await getSyncWeeksAhead();

  const heartbeat = setInterval(() => {
    void browser.storage.local.set({
      [storageKey]: { ...marker, heartbeatAt: Date.now(), lockId },
    });
  }, CALENDAR_SYNC_HEARTBEAT_MS);

  try {
    reportSyncProgress(params.onProgress, {
      phase: "preparing",
      current: 0,
      total: 1,
      message: mode === "incremental" ? "Fetching new week…" : "Fetching timetable…",
    });

    const assessmentRange =
      mode === "incremental" ? trailingWeekRange(weeksAhead) : syncWindowRange(weeksAhead);

    const [lessons, syncAssessmentDueDates] = await Promise.all([
      mode === "incremental"
        ? fetchTimetableLessons(assessmentRange)
        : fetchTimetableForSync(weeksAhead),
      getSyncAssessmentDueDates(),
    ]);

    const assessments = syncAssessmentDueDates
      ? await fetchAssessmentsForCalendarSync(assessmentRange)
      : [];

    return await syncLessonsToCalendar(
      config.lessonSyncProvider,
      {
        origin: location.origin,
        lessons,
        assessments,
        syncAssessmentDueDates,
        mode,
        weeksAhead,
      },
      () => getCalendarAccessToken(config.provider),
      { onProgress: params.onProgress },
    );
  } finally {
    clearInterval(heartbeat);
    await releaseCalendarSyncLock(config.provider, lockId);
  }
}

export async function resumeInterruptedCalendarSync(
  params: RunCalendarSyncParams = {},
): Promise<GoogleCalendarSyncResult | null> {
  const pending = await readResumableCalendarSync();
  if (!pending) return null;
  // Another tab is still mid-sync — leave its marker alone; a later page load resumes if it dies.
  if (await isCalendarSyncRunningElsewhere(pending.provider)) return null;

  const state =
    pending.provider === "google"
      ? await readGoogleCalendarState()
      : await readOutlookCalendarState();
  if (!state.refreshToken && !state.accessToken) {
    await clearCalendarSyncInProgressMarker(pending.provider);
    return null;
  }

  const config = pending.provider === "google" ? GOOGLE_SYNC_RUNNER : OUTLOOK_SYNC_RUNNER;
  return runCalendarSync(config, { ...params, mode: pending.mode });
}

export const runGoogleCalendarSync = (params?: RunCalendarSyncParams) =>
  runCalendarSync(GOOGLE_SYNC_RUNNER, params);

export const runOutlookCalendarSync = (params?: RunCalendarSyncParams) =>
  runCalendarSync(OUTLOOK_SYNC_RUNNER, params);

/** @internal Test hook for in-tab sync coalescing. */
export function __resetActiveCalendarSyncsForTests(): void {
  activeSyncs.clear();
}
