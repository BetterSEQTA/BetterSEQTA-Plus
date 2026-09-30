import { postSeqtaJson } from "./seqtaClient";
import type { PeopleCache } from "./rosterStore";
import { loadPeopleCache, savePeopleCache } from "./rosterStore";

const PEOPLE_TTL_MS = 24 * 60 * 60 * 1000;

type PeopleApiRow = {
  id?: number;
  xx_display?: string;
  house_colour?: string;
};

export async function refreshPeopleCacheIfStale(): Promise<PeopleCache> {
  const existing = await loadPeopleCache();
  const any = Object.values(existing)[0];
  if (any && Date.now() - any.updatedAt < PEOPLE_TTL_MS) return existing;

  const data = await postSeqtaJson<{ payload?: PeopleApiRow[] }>(
    "/seqta/student/load/message/people",
    { mode: "student" },
  );
  const rows = Array.isArray(data?.payload) ? data.payload : [];
  const next: PeopleCache = {};
  const now = Date.now();
  for (const row of rows) {
    if (row.id == null || !row.xx_display) continue;
    next[String(row.id)] = {
      xx_display: row.xx_display,
      house_colour: row.house_colour,
      updatedAt: now,
    };
  }
  await savePeopleCache(next);
  return next;
}

export function displayNameForSeqtaId(cache: PeopleCache, seqtaStudentId: number): string {
  return cache[String(seqtaStudentId)]?.xx_display ?? `Student ${seqtaStudentId}`;
}
