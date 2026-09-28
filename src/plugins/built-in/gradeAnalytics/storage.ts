import browser from "webextension-polyfill";
import type { DistributionMode } from "./gradeDistribution";
import type { AnalyticsCache, AnalyticsClassGroup } from "./types";

const STORAGE_PREFIX = "bsplus.analytics.v2";
const DISTRIBUTION_MODE_PREFIX = "bsplus.analytics.distMode.v1";
const CLASS_GROUPS_PREFIX = "bsplus.analytics.groups.v1";

export function analyticsStorageKey(origin: string, studentId: number): string {
  return `${STORAGE_PREFIX}.${origin}.${studentId}`;
}

export async function loadAnalyticsCache(
  origin: string,
  studentId: number,
): Promise<AnalyticsCache | null> {
  const key = analyticsStorageKey(origin, studentId);
  const result = await browser.storage.local.get(key);
  const cached = result[key] as AnalyticsCache | undefined;
  if (!cached?.assessments) return null;
  return cached;
}

export async function saveAnalyticsCache(
  origin: string,
  studentId: number,
  assessments: AnalyticsCache["assessments"],
): Promise<void> {
  const key = analyticsStorageKey(origin, studentId);
  const payload: AnalyticsCache = {
    updatedAt: Date.now(),
    assessments,
  };
  await browser.storage.local.set({ [key]: payload });
}

export function distributionModeStorageKey(
  origin: string,
  studentId: number,
): string {
  return `${DISTRIBUTION_MODE_PREFIX}.${origin}.${studentId}`;
}

const VALID_DISTRIBUTION_MODES: DistributionMode[] = ["auto", "letter", "percent"];

export async function loadDistributionMode(
  origin: string,
  studentId: number,
): Promise<DistributionMode | null> {
  const key = distributionModeStorageKey(origin, studentId);
  const result = await browser.storage.local.get(key);
  const mode = result[key];
  if (
    typeof mode === "string" &&
    VALID_DISTRIBUTION_MODES.includes(mode as DistributionMode)
  ) {
    return mode as DistributionMode;
  }
  return null;
}

export async function saveDistributionMode(
  origin: string,
  studentId: number,
  mode: DistributionMode,
): Promise<void> {
  const key = distributionModeStorageKey(origin, studentId);
  await browser.storage.local.set({ [key]: mode });
}

export function classGroupsStorageKey(origin: string, studentId: number): string {
  return `${CLASS_GROUPS_PREFIX}.${origin}.${studentId}`;
}

function isClassGroup(value: unknown): value is AnalyticsClassGroup {
  if (!value || typeof value !== "object") return false;
  const g = value as AnalyticsClassGroup;
  return (
    typeof g.id === "string" &&
    typeof g.name === "string" &&
    Array.isArray(g.classKeys) &&
    g.classKeys.every((key) => typeof key === "string")
  );
}

export async function loadClassGroups(
  origin: string,
  studentId: number,
): Promise<AnalyticsClassGroup[]> {
  const key = classGroupsStorageKey(origin, studentId);
  const result = await browser.storage.local.get(key);
  const raw = result[key];
  if (!Array.isArray(raw)) return [];
  return raw.filter(isClassGroup);
}

export async function saveClassGroups(
  origin: string,
  studentId: number,
  groups: AnalyticsClassGroup[],
): Promise<void> {
  const key = classGroupsStorageKey(origin, studentId);
  await browser.storage.local.set({ [key]: groups });
}
