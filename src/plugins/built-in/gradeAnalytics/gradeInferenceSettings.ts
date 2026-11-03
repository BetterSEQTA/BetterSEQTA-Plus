export interface GradeBandMapping {
  id: string;
  /** Rubric or letter label as shown in SEQTA (e.g. A, B+, Highly accomplished). */
  label: string;
  /** Approximate percentage (0–100) used in charts when SEQTA has no numeric mark. */
  percent: number;
}

export interface AnalyticsGradeInferenceSettings {
  /** Map rubric / letter bands to percentages (optional). */
  useCustomGradeBands: boolean;
  gradeBands: GradeBandMapping[];
  /**
   * When the overall assessment has no percentage, derive one from marked criteria
   * (e.g. sub-parts of a task). Analytics still works when this is off.
   */
  rollupCriteriaGrades: boolean;
}

export const DEFAULT_ANALYTICS_GRADE_INFERENCE: AnalyticsGradeInferenceSettings = {
  useCustomGradeBands: false,
  gradeBands: [],
  rollupCriteriaGrades: false,
};

export function normalizeGradeBandLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function createGradeBand(label: string, percent: number): GradeBandMapping {
  return {
    id: crypto.randomUUID(),
    label: label.trim(),
    percent: Math.min(100, Math.max(0, percent)),
  };
}
