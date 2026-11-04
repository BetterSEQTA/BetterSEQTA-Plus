import browser from "@/lib/browser";
import {
  GOOGLE_CALENDAR_SYNC_WEEKS,
  GOOGLE_CALENDAR_SYNC_WEEKS_MAX,
  GOOGLE_CALENDAR_SYNC_WEEKS_MIN,
} from "@/config/googleCalendar";
import {
  readGoogleCalendarState,
  readOutlookCalendarState,
} from "@/seqta/utils/calendarSync/providerStorage";

export const BSPLUS_CALENDAR_SYNC_SETTINGS_KEY = "bsplus_calendar_sync_settings";
/** @deprecated Legacy single marker; migrated to per-provider keys on read. */
export const BSPLUS_CALENDAR_SYNC_IN_PROGRESS_KEY = "bsplus_calendar_sync_in_progress";

export type CalendarSyncProvider = "google" | "outlook";

export const CALENDAR_SYNC_PROVIDERS: readonly CalendarSyncProvider[] = ["google", "outlook"];

/** Device-local interrupted sync marker per provider — never cloud-synced. */
export function calendarSyncInProgressStorageKey(provider: CalendarSyncProvider): string {
  return `bsplus_calendar_sync_in_progress_${provider}`;
}

export const BSPLUS_CALENDAR_SYNC_IN_PROGRESS_KEYS = [
  BSPLUS_CALENDAR_SYNC_IN_PROGRESS_KEY,
  ...CALENDAR_SYNC_PROVIDERS.map(calendarSyncInProgressStorageKey),
] as const;
export const CALENDAR_WEEKLY_ALARM = "bsplus_calendar_weekly";
export const WEEKLY_SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SharedCalendarSyncSettings {
  syncWeeksAhead?: number;
  autoSyncWeekly?: boolean;
  /** When true, sync assessment due dates alongside timetable events. */
  syncAssessmentDueDates?: boolean;
  lastWeeklySyncAt?: number;
  pendingWeeklySync?: boolean;
}

export async function readSharedCalendarSyncSettings(): Promise<SharedCalendarSyncSettings> {
  const got = await browser.storage.local.get(BSPLUS_CALENDAR_SYNC_SETTINGS_KEY);
  const raw = got[BSPLUS_CALENDAR_SYNC_SETTINGS_KEY];
  const shared =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as SharedCalendarSyncSettings)
      : {};

  if (Object.keys(shared).length > 0) return shared;

  const legacy = await readGoogleCalendarState();
  return {
    syncWeeksAhead: legacy.syncWeeksAhead,
    autoSyncWeekly: legacy.autoSyncWeekly,
    lastWeeklySyncAt: legacy.lastWeeklySyncAt,
    pendingWeeklySync: legacy.pendingWeeklySync,
  };
}

export async function writeSharedCalendarSyncSettings(
  patch: Partial<SharedCalendarSyncSettings>,
): Promise<SharedCalendarSyncSettings> {
  const current = await readSharedCalendarSyncSettings();
  const next = { ...current, ...patch };
  await browser.storage.local.set({ [BSPLUS_CALENDAR_SYNC_SETTINGS_KEY]: next });
  return next;
}

export function clampSyncWeeks(weeks: number): number {
  if (!Number.isFinite(weeks)) return GOOGLE_CALENDAR_SYNC_WEEKS;
  return Math.min(
    GOOGLE_CALENDAR_SYNC_WEEKS_MAX,
    Math.max(GOOGLE_CALENDAR_SYNC_WEEKS_MIN, Math.round(weeks)),
  );
}

export async function getSyncWeeksAhead(): Promise<number> {
  const settings = await readSharedCalendarSyncSettings();
  return clampSyncWeeks(settings.syncWeeksAhead ?? GOOGLE_CALENDAR_SYNC_WEEKS);
}

export async function getAutoSyncWeekly(): Promise<boolean> {
  const settings = await readSharedCalendarSyncSettings();
  return settings.autoSyncWeekly !== false;
}

export async function getSyncAssessmentDueDates(): Promise<boolean> {
  const settings = await readSharedCalendarSyncSettings();
  return settings.syncAssessmentDueDates === true;
}

export async function isAnyCalendarConnected(): Promise<boolean> {
  const [google, outlook] = await Promise.all([
    readGoogleCalendarState(),
    readOutlookCalendarState(),
  ]);
  return !!(
    google.refreshToken ||
    google.accessToken ||
    outlook.refreshToken ||
    outlook.accessToken
  );
}

export async function shouldRunWeeklySync(): Promise<boolean> {
  const settings = await readSharedCalendarSyncSettings();
  if (settings.autoSyncWeekly === false) return false;
  if (!(await isAnyCalendarConnected())) return false;
  if (settings.pendingWeeklySync) return true;
  const last = settings.lastWeeklySyncAt ?? 0;
  return Date.now() - last >= WEEKLY_SYNC_INTERVAL_MS;
}

export async function markWeeklySyncComplete(): Promise<void> {
  await writeSharedCalendarSyncSettings({
    lastWeeklySyncAt: Date.now(),
    pendingWeeklySync: false,
  });
}

export async function markWeeklySyncPending(): Promise<void> {
  await writeSharedCalendarSyncSettings({ pendingWeeklySync: true });
}

export type PendingCalendarSync = {
  provider: CalendarSyncProvider;
  mode: "full" | "incremental";
  origin: string;
  startedAt: number;
  /** Refreshed while a sync is running; a recent value means another tab is still syncing. */
  heartbeatAt?: number;
  /** Set when this tab owns the in-progress marker; used to detect cross-tab lock races. */
  lockId?: string;
};

export const CALENDAR_SYNC_HEARTBEAT_MS = 10_000;
const CALENDAR_SYNC_HEARTBEAT_STALE_MS = 45_000;

async function migrateLegacyCalendarSyncInProgressKey(): Promise<void> {
  const got = await browser.storage.local.get(BSPLUS_CALENDAR_SYNC_IN_PROGRESS_KEY);
  const raw = got[BSPLUS_CALENDAR_SYNC_IN_PROGRESS_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;

  const pending = raw as PendingCalendarSync;
  if (pending.provider !== "google" && pending.provider !== "outlook") {
    await browser.storage.local.remove(BSPLUS_CALENDAR_SYNC_IN_PROGRESS_KEY);
    return;
  }

  const key = calendarSyncInProgressStorageKey(pending.provider);
  const existing = await browser.storage.local.get(key);
  if (!existing[key]) {
    await browser.storage.local.set({ [key]: pending });
  }
  await browser.storage.local.remove(BSPLUS_CALENDAR_SYNC_IN_PROGRESS_KEY);
}

function isPendingHeartbeatLive(pending: PendingCalendarSync): boolean {
  const lastBeat = pending.heartbeatAt ?? pending.startedAt;
  return typeof lastBeat === "number" && Date.now() - lastBeat < CALENDAR_SYNC_HEARTBEAT_STALE_MS;
}

/** True when another tab holds a live in-progress marker for this provider. */
export async function isCalendarSyncRunningElsewhere(
  provider: CalendarSyncProvider,
): Promise<boolean> {
  await migrateLegacyCalendarSyncInProgressKey();
  const key = calendarSyncInProgressStorageKey(provider);
  const got = await browser.storage.local.get(key);
  const raw = got[key];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  return isPendingHeartbeatLive(raw as PendingCalendarSync);
}

export async function clearCalendarSyncInProgressMarker(
  provider: CalendarSyncProvider,
): Promise<void> {
  await browser.storage.local.remove(calendarSyncInProgressStorageKey(provider));
}

/**
 * Claim the cross-tab sync lock for a provider. Re-reads storage after write so only one tab wins
 * a simultaneous acquire (avoids check-then-set races).
 */
export async function tryAcquireCalendarSyncLock(
  provider: CalendarSyncProvider,
  mode: "full" | "incremental",
): Promise<{ acquired: true; lockId: string; marker: PendingCalendarSync } | { acquired: false }> {
  await migrateLegacyCalendarSyncInProgressKey();
  if (await isCalendarSyncRunningElsewhere(provider)) {
    return { acquired: false };
  }

  const lockId = crypto.randomUUID();
  const marker: PendingCalendarSync = {
    provider,
    mode,
    origin: location.origin,
    startedAt: Date.now(),
    heartbeatAt: Date.now(),
    lockId,
  };
  const key = calendarSyncInProgressStorageKey(provider);
  await browser.storage.local.set({ [key]: marker });
  const got = await browser.storage.local.get(key);
  const raw = got[key];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { acquired: false };
  }
  const stored = raw as PendingCalendarSync;
  if (stored.lockId !== lockId) {
    return { acquired: false };
  }
  return { acquired: true, lockId, marker };
}

/** Release the in-progress marker only when this tab still owns it. */
export async function releaseCalendarSyncLock(
  provider: CalendarSyncProvider,
  lockId: string,
): Promise<void> {
  const key = calendarSyncInProgressStorageKey(provider);
  const got = await browser.storage.local.get(key);
  const raw = got[key];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const stored = raw as PendingCalendarSync;
  if (stored.lockId === lockId) {
    await browser.storage.local.remove(key);
  }
}

async function readResumableCalendarSyncForProvider(
  provider: CalendarSyncProvider,
): Promise<PendingCalendarSync | null> {
  const key = calendarSyncInProgressStorageKey(provider);
  const got = await browser.storage.local.get(key);
  const raw = got[key];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const pending = raw as PendingCalendarSync;
  const validMode = pending.mode === "full" || pending.mode === "incremental";
  const fresh = Date.now() - pending.startedAt < 24 * 60 * 60 * 1000;

  if (pending.provider !== provider || !validMode || pending.origin !== location.origin || !fresh) {
    await browser.storage.local.remove(key);
    return null;
  }

  return pending;
}

/** Returns a pending sync worth resuming, or clears stale markers and returns null. */
export async function readResumableCalendarSync(): Promise<PendingCalendarSync | null> {
  await migrateLegacyCalendarSyncInProgressKey();
  for (const provider of CALENDAR_SYNC_PROVIDERS) {
    const pending = await readResumableCalendarSyncForProvider(provider);
    if (pending) return pending;
  }
  return null;
}
