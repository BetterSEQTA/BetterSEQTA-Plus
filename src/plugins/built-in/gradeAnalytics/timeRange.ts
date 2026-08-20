import type { Assessment } from "./types";

export type TimeRange = "all" | "ytd" | "365d" | "90d" | "30d" | "7d" | "custom";

export type CustomTimeRange = { from: string; to: string };

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "ytd", label: "This year" },
  { value: "365d", label: "Last 12 months" },
  { value: "90d", label: "Last 3 months" },
  { value: "30d", label: "Last 30 days" },
  { value: "7d", label: "Last 7 days" },
  { value: "custom", label: "Custom range" },
];

export function defaultCustomTimeRange(referenceDate = new Date()): CustomTimeRange {
  return {
    from: `${referenceDate.getFullYear()}-01-01`,
    to: referenceDate.toISOString().slice(0, 10),
  };
}

function parseDateOnly(iso: string): Date {
  const date = new Date(`${iso}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getTimeRangeBounds(
  timeRange: TimeRange,
  custom?: CustomTimeRange,
  referenceDate = new Date(),
): { start: Date | null; end: Date | null } {
  if (timeRange === "all") return { start: null, end: null };

  if (timeRange === "ytd") {
    const start = new Date(referenceDate.getFullYear(), 0, 1);
    start.setHours(0, 0, 0, 0);
    return { start, end: null };
  }

  if (timeRange === "custom") {
    if (!custom?.from || !custom?.to) return { start: null, end: null };
    let start = parseDateOnly(custom.from);
    let end = parseDateOnly(custom.to);
    end.setHours(23, 59, 59, 999);
    if (start > end) [start, end] = [end, start];
    return { start, end };
  }

  let days = 90;
  if (timeRange === "30d") days = 30;
  else if (timeRange === "7d") days = 7;
  else if (timeRange === "365d") days = 365;

  const start = new Date(referenceDate);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return { start, end: null };
}

export function getTimeRangeCutoff(
  timeRange: TimeRange,
  custom?: CustomTimeRange,
): Date | null {
  return getTimeRangeBounds(timeRange, custom).start;
}

export function getTimeRangeLabel(
  timeRange: TimeRange,
  custom?: CustomTimeRange,
): string {
  if (timeRange === "custom" && custom?.from && custom?.to) {
    const fmt = (iso: string) =>
      parseDateOnly(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    return `${fmt(custom.from)} – ${fmt(custom.to)}`;
  }
  return TIME_RANGE_OPTIONS.find((o) => o.value === timeRange)?.label ?? "All time";
}

function assessmentInRange(
  due: string,
  bounds: { start: Date | null; end: Date | null },
): boolean {
  const date = new Date(due);
  if (bounds.start && date < bounds.start) return false;
  if (bounds.end && date > bounds.end) return false;
  return true;
}

export function filterAssessmentsByTimeRange(
  assessments: Assessment[],
  timeRange: TimeRange,
  custom?: CustomTimeRange,
): Assessment[] {
  const bounds = getTimeRangeBounds(timeRange, custom);
  if (!bounds.start && !bounds.end) return assessments;
  return assessments.filter((a) => assessmentInRange(a.due, bounds));
}

function usesMonthlyGrouping(
  timeRange: TimeRange,
  custom?: CustomTimeRange,
): boolean {
  if (timeRange === "365d" || timeRange === "all" || timeRange === "ytd") return true;
  if (timeRange !== "custom" || !custom?.from || !custom?.to) return false;
  const { start, end } = getTimeRangeBounds(timeRange, custom);
  if (!start || !end) return true;
  return end.getTime() - start.getTime() > 90 * 86_400_000;
}

export type TrendPoint = {
  date: Date;
  average: number | null;
  count: number;
  forecast?: number;
  [seriesKey: string]: number | Date | null | undefined;
};

export type TrendSeries = {
  key: string;
  label: string;
  color: string;
  isOverall?: boolean;
};

const SUBJECT_CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#ea580c",
  "#db2777",
  "#4f46e5",
  "#0d9488",
  "#b45309",
  "#7c3aed",
  "#dc2626",
];

export function subjectChartColor(index: number): string {
  return SUBJECT_CHART_COLORS[index % SUBJECT_CHART_COLORS.length];
}

function periodKeyForAssessment(
  assessment: Assessment,
  useMonthlyGrouping: boolean,
): string {
  const date = new Date(assessment.due);
  if (useMonthlyGrouping) {
    return date.toISOString().slice(0, 7);
  }
  const monday = new Date(date);
  const dayOfWeek = date.getDay();
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function periodDate(periodKey: string, useMonthlyGrouping: boolean): Date {
  return useMonthlyGrouping ? new Date(`${periodKey}-01`) : new Date(periodKey);
}

function average(nums: number[]): number {
  return nums.reduce((sum, g) => sum + g, 0) / nums.length;
}

function slugSubjectKey(name: string, keyBySubject: Map<string, string>): string {
  if (keyBySubject.has(name)) return keyBySubject.get(name)!;
  let base =
    name
      .trim()
      .replace(/[^\w]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "subject";
  const taken = new Set(keyBySubject.values());
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${base}_${n}`;
    n++;
  }
  keyBySubject.set(name, candidate);
  return candidate;
}

export function buildGradeTrendChart(
  data: Assessment[],
  timeRange: TimeRange,
  options: { showPerSubject?: boolean; custom?: CustomTimeRange } = {},
): { points: TrendPoint[]; series: TrendSeries[]; accentColor: string } {
  const accentColor =
    "var(--bsplus-analytics-accent, var(--better-main, #007bff))";

  const graded = data.filter(
    (a) => a.finalGrade !== undefined && a.finalGrade !== null,
  );
  if (!graded.length) {
    return { points: [], series: [], accentColor };
  }

  const bounds = getTimeRangeBounds(timeRange, options.custom);
  const useMonthlyGrouping = usesMonthlyGrouping(timeRange, options.custom);

  const overallBuckets = new Map<string, number[]>();
  const subjectBuckets = new Map<string, Map<string, number[]>>();
  const subjectLabels = new Map<string, string>();
  const keyBySubject = new Map<string, string>();

  for (const assessment of graded) {
    if (!assessmentInRange(assessment.due, bounds)) continue;

    const grade = assessment.finalGrade!;
    const periodKey = periodKeyForAssessment(assessment, useMonthlyGrouping);
    const periodDateValue = periodDate(periodKey, useMonthlyGrouping);
    if (bounds.start && periodDateValue < bounds.start) continue;
    if (bounds.end && periodDateValue > bounds.end) continue;

    if (!overallBuckets.has(periodKey)) overallBuckets.set(periodKey, []);
    overallBuckets.get(periodKey)!.push(grade);

    if (options.showPerSubject) {
      const subject = assessment.subject;
      if (!subjectBuckets.has(subject)) {
        subjectBuckets.set(subject, new Map());
        subjectLabels.set(subject, subject);
        slugSubjectKey(subject, keyBySubject);
      }
      const buckets = subjectBuckets.get(subject)!;
      if (!buckets.has(periodKey)) buckets.set(periodKey, []);
      buckets.get(periodKey)!.push(grade);
    }
  }

  const periodKeys = new Set<string>(overallBuckets.keys());
  if (options.showPerSubject) {
    for (const buckets of subjectBuckets.values()) {
      for (const key of buckets.keys()) periodKeys.add(key);
    }
  }

  const points: TrendPoint[] = Array.from(periodKeys)
    .sort()
    .map((periodKey) => {
      const grades = overallBuckets.get(periodKey) ?? [];
      const point: TrendPoint = {
        date: periodDate(periodKey, useMonthlyGrouping),
        average: grades.length ? average(grades) : NaN,
        count: grades.length,
      };

      if (options.showPerSubject) {
        for (const [subject, buckets] of subjectBuckets) {
          const seriesKey = keyBySubject.get(subject)!;
          const subjectGrades = buckets.get(periodKey);
          if (subjectGrades?.length) {
            point[seriesKey] = average(subjectGrades);
          }
        }
      }

      return point;
    })
    .filter((p) => {
      if (!Number.isNaN(p.average)) return true;
      if (!options.showPerSubject) return false;
      return Object.keys(p).some(
        (key) =>
          key !== "date" &&
          key !== "average" &&
          key !== "count" &&
          typeof p[key] === "number" &&
          !Number.isNaN(p[key] as number),
      );
    });

  const series: TrendSeries[] = [
    {
      key: "average",
      label: "Overall average",
      color: accentColor,
      isOverall: true,
    },
  ];

  if (options.showPerSubject) {
    const subjects = [...subjectLabels.keys()].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    subjects.forEach((subject, index) => {
      series.push({
        key: keyBySubject.get(subject)!,
        label: subject,
        color: subjectChartColor(index),
      });
    });
  }

  return { points, series, accentColor };
}
