import browser from "webextension-polyfill";
import type { DistributionMode } from "./gradeDistribution";
import type { AnalyticsCache } from "./types";

const STORAGE_PREFIX = "bsplus.analytics.v2";
const DISTRIBUTION_MODE_PREFIX = "bsplus.analytics.distMode.v1";

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
