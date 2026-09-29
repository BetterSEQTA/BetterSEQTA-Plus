import browser from "webextension-polyfill";
import type { DistributionMode } from "./gradeDistribution";
import {
  DEFAULT_ANALYTICS_GRADE_INFERENCE,
  type AnalyticsGradeInferenceSettings,
  type GradeBandMapping,
} from "./gradeInferenceSettings";
import type { AnalyticsCache, AnalyticsClassGroup } from "./types";

const STORAGE_PREFIX = "bsplus.analytics.v2";
const DISTRIBUTION_MODE_PREFIX = "bsplus.analytics.distMode.v1";
const CLASS_GROUPS_PREFIX = "bsplus.analytics.groups.v1";
const GRADE_INFERENCE_PREFIX = "bsplus.analytics.gradeInference.v1";

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

export function gradeInferenceStorageKey(origin: string, studentId: number): string {
  return `${GRADE_INFERENCE_PREFIX}.${origin}.${studentId}`;
}

function isGradeBand(value: unknown): value is GradeBandMapping {
  if (!value || typeof value !== "object") return false;
  const row = value as GradeBandMapping;
  return (
    typeof row.id === "string" &&
    typeof row.label === "string" &&
    typeof row.percent === "number" &&
    !Number.isNaN(row.percent)
  );
}

function sanitizeInferenceSettings(raw: unknown): AnalyticsGradeInferenceSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_ANALYTICS_GRADE_INFERENCE, gradeBands: [] };
  }
  const row = raw as Partial<AnalyticsGradeInferenceSettings>;
  const gradeBands = Array.isArray(row.gradeBands)
    ? row.gradeBands.filter(isGradeBand).map((band) => ({
        ...band,
        percent: Math.min(100, Math.max(0, band.percent)),
      }))
    : [];
  return {
    useCustomGradeBands: Boolean(row.useCustomGradeBands),
    rollupCriteriaGrades: Boolean(row.rollupCriteriaGrades),
    gradeBands,
  };
}

export async function loadGradeInferenceSettings(
  origin: string,
  studentId: number,
): Promise<AnalyticsGradeInferenceSettings> {
  const key = gradeInferenceStorageKey(origin, studentId);
  const result = await browser.storage.local.get(key);
  return sanitizeInferenceSettings(result[key]);
}

export async function saveGradeInferenceSettings(
  origin: string,
  studentId: number,
  settings: AnalyticsGradeInferenceSettings,
): Promise<void> {
  const key = gradeInferenceStorageKey(origin, studentId);
  await browser.storage.local.set({ [key]: sanitizeInferenceSettings(settings) });
}
