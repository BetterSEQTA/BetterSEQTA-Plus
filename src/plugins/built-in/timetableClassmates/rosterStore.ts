import localforage, { type LocalForage } from "localforage";
import { getInstanceHostname } from "@/seqta/utils/feedback/client";
import type { ArchivedMembers, ClassRosterIndex } from "./rosterMerge";
import { resolveStudentId } from "./seqtaClient";
import { TIMETABLE_CLASSMATES_CONSENT_VERSION } from "./constants";

const ROSTER_KEY = "classRosterIndex";
const PEOPLE_CACHE_KEY = "peopleCache";
const PEOPLE_CACHE_FETCHED_AT_KEY = "peopleCacheFetchedAt";
const CI_MAP_KEY = "ciToClassKey";
const ARCHIVED_KEY = "archivedMembers";
const SESSION_KEY = "session";

const storeCache = new Map<string, LocalForage>();

export type PeopleCacheEntry = {
  xx_display: string;
  house_colour?: string;
  updatedAt: number;
};

export type PeopleCache = Record<string, PeopleCacheEntry>;

export type ClassmatesSession = {
  showAvatars: boolean;
  syncOptIn: boolean;
  consentAt?: number;
  consentVersion?: number;
  lastSyncAt?: number;
  lastPeerCount?: number;
  lastHeartbeatAt?: number;
  lastPublishedEnrollmentHash?: string;
};

const defaultSession = (): ClassmatesSession => ({
  showAvatars: false,
  syncOptIn: false,
});

export async function resolveClassmatesScope(): Promise<string | null> {
  const host = getInstanceHostname()?.toLowerCase();
  const studentId = await resolveStudentId();
  if (!host || studentId == null) return null;
  return `${host}#${studentId}`;
}

function storeNameForScope(scope: string): string {
  return scope.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 72);
}

function storeForScope(scope: string): LocalForage {
  const name = storeNameForScope(scope);
  let instance = storeCache.get(name);
  if (!instance) {
    instance = localforage.createInstance({
      name: "timetable-classmates",
      storeName: name,
    });
    storeCache.set(name, instance);
  }
  return instance;
}

async function scopedStore(): Promise<LocalForage | null> {
  const scope = await resolveClassmatesScope();
  if (!scope) return null;
  return storeForScope(scope);
}

export async function loadSession(): Promise<ClassmatesSession> {
  const store = await scopedStore();
  if (!store) return defaultSession();
  const data = await store.getItem<ClassmatesSession>(SESSION_KEY);
  if (!data || typeof data !== "object") return defaultSession();
  return {
    ...defaultSession(),
    ...data,
  };
}

export async function saveSession(session: ClassmatesSession): Promise<void> {
  const store = await scopedStore();
  if (!store) return;
  await store.setItem(SESSION_KEY, session);
}

export async function patchSession(patch: Partial<ClassmatesSession>): Promise<ClassmatesSession> {
  const next = { ...(await loadSession()), ...patch };
  await saveSession(next);
  return next;
}

export async function loadRosterIndex(): Promise<ClassRosterIndex> {
  const store = await scopedStore();
  if (!store) return {};
  const data = await store.getItem<ClassRosterIndex>(ROSTER_KEY);
  return data && typeof data === "object" ? data : {};
}

export async function saveRosterIndex(index: ClassRosterIndex): Promise<void> {
  const store = await scopedStore();
  if (!store) return;
  await store.setItem(ROSTER_KEY, index);
}

export async function loadPeopleCache(): Promise<PeopleCache> {
  const store = await scopedStore();
  if (!store) return {};
  const data = await store.getItem<PeopleCache>(PEOPLE_CACHE_KEY);
  return data && typeof data === "object" ? data : {};
}

export async function savePeopleCache(cache: PeopleCache): Promise<void> {
  const store = await scopedStore();
  if (!store) return;
  await store.setItem(PEOPLE_CACHE_KEY, cache);
}

export async function loadPeopleCacheFetchedAt(): Promise<number | null> {
  const store = await scopedStore();
  if (!store) return null;
  const at = await store.getItem<number>(PEOPLE_CACHE_FETCHED_AT_KEY);
  return typeof at === "number" ? at : null;
}

export async function savePeopleCacheFetchedAt(at: number): Promise<void> {
  const store = await scopedStore();
  if (!store) return;
  await store.setItem(PEOPLE_CACHE_FETCHED_AT_KEY, at);
}

export async function loadCiToClassKey(): Promise<Record<string, string>> {
  const store = await scopedStore();
  if (!store) return {};
  const data = await store.getItem<Record<string, string>>(CI_MAP_KEY);
  return data && typeof data === "object" ? data : {};
}

export async function saveCiToClassKey(map: Record<string, string>): Promise<void> {
  const store = await scopedStore();
  if (!store) return;
  await store.setItem(CI_MAP_KEY, map);
}

/** Ensures timetable `data-instance` → roster class keys exist for painting. */
export async function ensureCiToClassKey(
  loader: () => Promise<{ ciToClassKey: Record<string, string> }>,
): Promise<Record<string, string>> {
  const existing = await loadCiToClassKey();
  if (Object.keys(existing).length > 0) return existing;
  try {
    const { ciToClassKey } = await loader();
    if (Object.keys(ciToClassKey).length > 0) {
      await saveCiToClassKey(ciToClassKey);
      return ciToClassKey;
    }
  } catch {
    /* SEQTA timetable fetch may fail off-week */
  }
  return existing;
}

export async function loadArchivedMembers(): Promise<ArchivedMembers> {
  const store = await scopedStore();
  if (!store) return {};
  const data = await store.getItem<ArchivedMembers>(ARCHIVED_KEY);
  return data && typeof data === "object" ? data : {};
}

export async function saveArchivedMembers(archived: ArchivedMembers): Promise<void> {
  const store = await scopedStore();
  if (!store) return;
  await store.setItem(ARCHIVED_KEY, archived);
}

export async function recordConsent(): Promise<void> {
  await patchSession({
    consentAt: Date.now(),
    consentVersion: TIMETABLE_CLASSMATES_CONSENT_VERSION,
  });
}

export const CLASSMATES_UPDATED_EVENT = "timetable-classmates-updated";

export function notifyClassmatesUpdated(): void {
  window.dispatchEvent(new CustomEvent(CLASSMATES_UPDATED_EVENT));
}
