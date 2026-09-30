import { approximatePercentFromLetterGrade } from "./letterGradeScale";
import {
  normalizeGradeBandLabel,
  type AnalyticsGradeInferenceSettings,
} from "./gradeInferenceSettings";

export type GradeResolutionSource =
  | "seqta"
  | "criteriaRollup"
  | "customBand"
  | "defaultLetter";

export type GradeResolution = {
  finalGrade?: number;
  letterGrade?: string;
  source?: GradeResolutionSource;
};

type CriterionRow = {
  results?: { percentage?: unknown; grade?: unknown; score?: unknown };
  weight?: unknown;
  weighting?: unknown;
  maxMark?: unknown;
  max?: unknown;
};

function parsePercent(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  if (Number.isNaN(n)) return undefined;
  return Math.min(100, Math.max(0, n));
}

function parseGradeString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

function customPercentFromGradeLabel(
  label: string | undefined,
  settings: AnalyticsGradeInferenceSettings,
): number | undefined {
  if (!label) return undefined;
  if (settings.useCustomGradeBands && settings.gradeBands.length > 0) {
    const key = normalizeGradeBandLabel(label);
    for (const band of settings.gradeBands) {
      if (normalizeGradeBandLabel(band.label) === key) {
        return band.percent;
      }
    }
  }
  return undefined;
}

function criterionWeight(row: CriterionRow): number | undefined {
  const raw = row.weight ?? row.weighting ?? row.maxMark ?? row.max;
  const n = Number(raw);
  if (Number.isNaN(n) || n <= 0) return undefined;
  return n;
}

/** Average or weighted mean of criterion percentages / mapped rubric grades. */
export function rollupPercentFromCriteria(
  criteria: CriterionRow[] | undefined,
  settings: AnalyticsGradeInferenceSettings,
): number | undefined {
  if (!criteria?.length) return undefined;

  const parts: { percent: number; weight?: number }[] = [];

  for (const row of criteria) {
    const direct = parsePercent(row.results?.percentage ?? row.results?.score);
    if (direct !== undefined) {
      parts.push({ percent: direct, weight: criterionWeight(row) });
      continue;
    }
    const letter = parseGradeString(row.results?.grade);
    const mapped =
      customPercentFromGradeLabel(letter, settings) ??
      approximatePercentFromLetterGrade(letter);
    if (mapped !== undefined) {
      parts.push({ percent: mapped, weight: criterionWeight(row) });
    }
  }

  if (!parts.length) return undefined;

  const withWeights = parts.filter((p) => p.weight !== undefined);
  if (withWeights.length === parts.length) {
    const totalWeight = withWeights.reduce((sum, p) => sum + (p.weight ?? 0), 0);
    if (totalWeight > 0) {
      const weighted = withWeights.reduce(
        (sum, p) => sum + p.percent * (p.weight ?? 0),
        0,
      );
      return Math.round((weighted / totalWeight) * 10) / 10;
    }
  }

  const avg = parts.reduce((sum, p) => sum + p.percent, 0) / parts.length;
  return Math.round(avg * 10) / 10;
}

export function resolveGradeFromAssessmentPayload(
  assessment: Record<string, unknown>,
  settings: AnalyticsGradeInferenceSettings,
): GradeResolution {
  if (assessment.status !== "MARKS_RELEASED") {
    return {};
  }

  const criteria = assessment.criteria as CriterionRow[] | undefined;

  const topPercent = parsePercent(
    (assessment.results as { percentage?: unknown } | undefined)?.percentage,
  );
  if (topPercent !== undefined) {
    return {
      finalGrade: topPercent,
      letterGrade: extractLetterFromPayload(assessment),
      source: "seqta",
    };
  }

  const finalDirect = parsePercent(assessment.finalGrade);
  if (finalDirect !== undefined) {
    return {
      finalGrade: finalDirect,
      letterGrade: extractLetterFromPayload(assessment),
      source: "seqta",
    };
  }

  if (settings.rollupCriteriaGrades) {
    const rolled = rollupPercentFromCriteria(criteria, settings);
    if (rolled !== undefined) {
      return {
        finalGrade: rolled,
        letterGrade: extractLetterFromPayload(assessment),
        source: "criteriaRollup",
      };
    }
  } else {
    const firstCriterionPercent = parsePercent(criteria?.[0]?.results?.percentage);
    if (firstCriterionPercent !== undefined) {
      return {
        finalGrade: firstCriterionPercent,
        letterGrade: extractLetterFromPayload(assessment),
        source: "seqta",
      };
    }
  }

  const letter = extractLetterFromPayload(assessment);
  if (letter) {
    const custom = settings.useCustomGradeBands
      ? customPercentFromGradeLabel(letter, settings)
      : undefined;
    const finalGrade =
      custom ?? approximatePercentFromLetterGrade(letter);
    if (finalGrade !== undefined) {
      return {
        finalGrade,
        letterGrade: letter,
        source: custom !== undefined ? "customBand" : "defaultLetter",
      };
    }
    return { letterGrade: letter };
  }

  return {};
}

function extractLetterFromPayload(assessment: Record<string, unknown>): string | undefined {
  const criteria = assessment.criteria as CriterionRow[] | undefined;
  const fromCriteria = parseGradeString(criteria?.[0]?.results?.grade);
  if (fromCriteria) return fromCriteria;
  const fromResults = parseGradeString(
    (assessment.results as { grade?: unknown } | undefined)?.grade,
  );
  if (fromResults) return fromResults;
  if (assessment.letterGrade != null) {
    return parseGradeString(assessment.letterGrade);
  }
  return undefined;
}
