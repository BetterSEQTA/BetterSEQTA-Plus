import { approximatePercentFromLetterGrade } from "./letterGradeScale";
import type { Assessment } from "./types";

export type DistributionMode = "auto" | "letter" | "percent";

export const DISTRIBUTION_MODE_OPTIONS: {
  value: DistributionMode;
  label: string;
  description: string;
}[] = [
  {
    value: "auto",
    label: "Auto",
    description: "Letter grades when your school uses them, otherwise percentages",
  },
  {
    value: "letter",
    label: "Letter grades",
    description: "Group by letter band (school scale or standard A–F)",
  },
  {
    value: "percent",
    label: "Percentage bands",
    description: "Group by score ranges (90–100, 80–89, …)",
  },
];

export type DistributionBucket = {
  label: string;
  count: number;
  minPercent?: number;
  maxPercent?: number;
};

export type GradeDistributionResult = {
  buckets: DistributionBucket[];
  modeUsed: "letter" | "percent";
  scaleSource: "inferred" | "standard" | "percent";
  scaleLabel: string;
  gradedCount: number;
  averagePercent: number | null;
  letterGradeCoverage: number;
};

const PERCENT_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "90–100", min: 90, max: 100 },
  { label: "80–89", min: 80, max: 89 },
  { label: "70–79", min: 70, max: 79 },
  { label: "60–69", min: 60, max: 69 },
  { label: "50–59", min: 50, max: 59 },
  { label: "0–49", min: 0, max: 49 },
];

/** Standard A–F (+ modifiers) ordering when school scale cannot be inferred. */
const STANDARD_LETTER_ORDER = [
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "E",
  "F",
  "HD",
  "CR",
  "P",
  "PS",
  "N",
  "PASS",
  "FAIL",
] as const;

export type InferredLetterBand = {
  key: string;
  label: string;
  medianPercent: number;
  minPercent: number;
  maxPercent: number;
  pairedSamples: number;
  totalCount: number;
};

export type InferredLetterScale = {
  bands: InferredLetterBand[];
  pairedCount: number;
  letterAssessmentCount: number;
  confidence: "high" | "medium" | "low";
};

function normalizeLetterKey(raw: string): string {
  const s = raw.trim().toLowerCase();
  const first = s.split(/[\s(/]/)[0] ?? s;
  return first.replace(/[^a-z0-9+-]/gi, "") || s;
}

function pickDisplayLabel(variants: string[]): string {
  if (!variants.length) return "";
  const counts = new Map<string, number>();
  for (const v of variants) {
    const t = v.trim();
    if (!t) continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let best = variants[0].trim();
  let bestCount = 0;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = label;
    }
  }
  return best;
}

export function looksLikeLetterGrade(raw: string | undefined | null): boolean {
  if (raw == null) return false;
  const t = raw.trim();
  if (!t) return false;
  if (/^\d+(\.\d+)?%?$/.test(t)) return false;
  if (t.length > 12) return false;
  const upper = t.toUpperCase();
  if (["HD", "CR", "P", "PS", "N", "PASS", "FAIL"].includes(upper)) return true;
  return /[a-zA-Z]/.test(t);
}

function isGradedAssessment(a: Assessment): boolean {
  return (
    a.finalGrade !== undefined ||
    (a.letterGrade != null && looksLikeLetterGrade(a.letterGrade))
  );
}

function buildStandardLetterScale(): InferredLetterScale {
  const bands: InferredLetterBand[] = [];
  const seen = new Set<string>();

  for (const label of STANDARD_LETTER_ORDER) {
    const key = normalizeLetterKey(label);
    if (seen.has(key)) continue;
    const approx = approximatePercentFromLetterGrade(label);
    if (approx === undefined) continue;
    seen.add(key);
    bands.push({
      key,
      label,
      medianPercent: approx,
      minPercent: approx,
      maxPercent: approx,
      pairedSamples: 0,
      totalCount: 0,
    });
  }

  bands.sort((a, b) => b.medianPercent - a.medianPercent);

  for (let i = 0; i < bands.length; i++) {
    const above = bands[i - 1];
    const below = bands[i + 1];
    bands[i].maxPercent =
      above != null
        ? (above.medianPercent + bands[i].medianPercent) / 2
        : 100;
    bands[i].minPercent =
      below != null
        ? (below.medianPercent + bands[i].medianPercent) / 2
        : 0;
  }

  return {
    bands,
    pairedCount: 0,
    letterAssessmentCount: 0,
    confidence: "low",
  };
}

/**
 * Learn letter bands from assessments that report both % and the letter SEQTA assigned.
 */
export function inferLetterGradeScale(
  assessments: Assessment[],
): InferredLetterScale | null {
  const pairMap = new Map<string, { percents: number[]; labels: string[] }>();
  const letterOnlyMap = new Map<string, { labels: string[]; count: number }>();
  let pairedCount = 0;
  let letterAssessmentCount = 0;

  for (const a of assessments) {
    if (!isGradedAssessment(a)) continue;

    const letterRaw = a.letterGrade?.trim();
    const hasLetter = letterRaw && looksLikeLetterGrade(letterRaw);
    if (hasLetter) letterAssessmentCount++;

    if (hasLetter && a.finalGrade !== undefined) {
      const key = normalizeLetterKey(letterRaw);
      if (/^\d+(\.\d+)?$/.test(key)) continue;
      pairedCount++;
      if (!pairMap.has(key)) pairMap.set(key, { percents: [], labels: [] });
      const entry = pairMap.get(key)!;
      entry.percents.push(a.finalGrade);
      entry.labels.push(letterRaw);
    } else if (hasLetter) {
      const key = normalizeLetterKey(letterRaw);
      if (/^\d+(\.\d+)?$/.test(key)) continue;
      if (!letterOnlyMap.has(key)) letterOnlyMap.set(key, { labels: [], count: 0 });
      const entry = letterOnlyMap.get(key)!;
      entry.count++;
      entry.labels.push(letterRaw);
    }
  }

  if (letterAssessmentCount < 2 && pairedCount < 2) return null;

  const allKeys = new Set([...pairMap.keys(), ...letterOnlyMap.keys()]);
  if (allKeys.size < 2 && pairedCount < 2) return null;

  const bands: InferredLetterBand[] = [];

  for (const key of allKeys) {
    const paired = pairMap.get(key);
    const letterOnly = letterOnlyMap.get(key);
    const labels = [...(paired?.labels ?? []), ...(letterOnly?.labels ?? [])];
    const percents = paired?.percents ?? [];
    const totalCount = percents.length + (letterOnly?.count ?? 0);

    let medianPercent: number;
    let minPercent: number;
    let maxPercent: number;

    if (percents.length > 0) {
      const sorted = [...percents].sort((x, y) => x - y);
      medianPercent = sorted[Math.floor(sorted.length / 2)]!;
      minPercent = sorted[0]!;
      maxPercent = sorted[sorted.length - 1]!;
    } else {
      const approx = approximatePercentFromLetterGrade(pickDisplayLabel(labels));
      if (approx === undefined) continue;
      medianPercent = approx;
      minPercent = approx;
      maxPercent = approx;
    }

    bands.push({
      key,
      label: pickDisplayLabel(labels),
      medianPercent,
      minPercent,
      maxPercent,
      pairedSamples: percents.length,
      totalCount,
    });
  }

  if (bands.length < 2) return null;

  bands.sort((a, b) => b.medianPercent - a.medianPercent);

  for (let i = 0; i < bands.length; i++) {
    const above = bands[i - 1];
    const below = bands[i + 1];
    if (bands[i].pairedSamples > 0 || above?.pairedSamples || below?.pairedSamples) {
      bands[i].maxPercent =
        above != null
          ? (above.medianPercent + bands[i].medianPercent) / 2
          : 100;
      bands[i].minPercent =
        below != null
          ? (below.medianPercent + bands[i].medianPercent) / 2
          : 0;
    }
  }

  const confidence: InferredLetterScale["confidence"] =
    pairedCount >= 8 || (pairedCount >= 5 && pairedCount / letterAssessmentCount >= 0.4)
      ? "high"
      : pairedCount >= 3 || letterAssessmentCount >= 5
        ? "medium"
        : "low";

  return {
    bands,
    pairedCount,
    letterAssessmentCount,
    confidence,
  };
}

function resolveEffectiveMode(
  mode: DistributionMode,
  inferred: InferredLetterScale | null,
  graded: Assessment[],
): "letter" | "percent" {
  if (mode === "percent") return "percent";
  if (mode === "letter") return "letter";

  if (!inferred) return "percent";
  const letterCount = graded.filter(
    (a) => a.letterGrade && looksLikeLetterGrade(a.letterGrade),
  ).length;
  if (letterCount === 0) return "percent";
  if (inferred.confidence === "high" || inferred.confidence === "medium") {
    return "letter";
  }
  return letterCount / graded.length >= 0.35 ? "letter" : "percent";
}

function assignPercentToBand(
  percent: number,
  scale: InferredLetterScale,
): string | null {
  if (!scale.bands.length) return null;
  for (const band of scale.bands) {
    if (percent >= band.minPercent) return band.key;
  }
  return scale.bands[scale.bands.length - 1]!.key;
}

function buildPercentDistribution(graded: Assessment[]): GradeDistributionResult {
  const counts = PERCENT_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
  let percentSum = 0;
  let percentCount = 0;

  for (const a of graded) {
    let grade = a.finalGrade;
    if (grade === undefined && a.letterGrade) {
      grade = approximatePercentFromLetterGrade(a.letterGrade);
    }
    if (grade === undefined) continue;
    percentSum += grade;
    percentCount++;
    const bucket = PERCENT_BUCKETS.find((b) => grade! >= b.min && grade! <= b.max);
    if (bucket) {
      const row = counts.find((c) => c.label === bucket.label);
      if (row) row.count++;
    }
  }

  return {
    buckets: counts,
    modeUsed: "percent",
    scaleSource: "percent",
    scaleLabel: "Percentage bands",
    gradedCount: graded.length,
    averagePercent:
      percentCount > 0 ? Math.round((percentSum / percentCount) * 10) / 10 : null,
    letterGradeCoverage: 0,
  };
}

function buildLetterDistribution(
  graded: Assessment[],
  inferred: InferredLetterScale | null,
  forceStandard: boolean,
): GradeDistributionResult {
  const scale =
    !forceStandard && inferred && inferred.bands.length >= 2
      ? inferred
      : buildStandardLetterScale();
  const scaleSource =
    !forceStandard && inferred && inferred.bands.length >= 2 ? "inferred" : "standard";

  const countByKey = new Map<string, number>();
  for (const band of scale.bands) countByKey.set(band.key, 0);

  let percentSum = 0;
  let percentCount = 0;
  let withLetter = 0;

  for (const a of graded) {
    if (a.finalGrade !== undefined) {
      percentSum += a.finalGrade;
      percentCount++;
    }

    const letterRaw = a.letterGrade?.trim();
    if (letterRaw && looksLikeLetterGrade(letterRaw)) withLetter++;

    let key: string | null = null;
    if (letterRaw && looksLikeLetterGrade(letterRaw)) {
      key = normalizeLetterKey(letterRaw);
      if (/^\d+(\.\d+)?$/.test(key)) key = null;
    }
    if (!key && a.finalGrade !== undefined) {
      key = assignPercentToBand(a.finalGrade, scale);
    }
    if (!key && letterRaw && looksLikeLetterGrade(letterRaw)) {
      const approx = approximatePercentFromLetterGrade(letterRaw);
      if (approx !== undefined) key = assignPercentToBand(approx, scale);
    }
    if (!key) continue;

    if (!countByKey.has(key)) {
      countByKey.set(key, 0);
      const existing = scale.bands.find((b) => b.key === key);
      if (!existing) {
        const approx =
          a.finalGrade ??
          (letterRaw ? approximatePercentFromLetterGrade(letterRaw) : undefined) ??
          0;
        scale.bands.push({
          key,
          label:
            letterRaw && looksLikeLetterGrade(letterRaw)
              ? letterRaw
              : key.toUpperCase(),
          medianPercent: approx,
          minPercent: 0,
          maxPercent: 100,
          pairedSamples: 0,
          totalCount: 0,
        });
        scale.bands.sort((x, y) => y.medianPercent - x.medianPercent);
      }
    }
    countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
  }

  const buckets: DistributionBucket[] = scale.bands
    .filter((b) => (countByKey.get(b.key) ?? 0) > 0)
    .map((b) => ({
      label: b.label,
      count: countByKey.get(b.key) ?? 0,
      minPercent: Math.round(b.minPercent),
      maxPercent: Math.round(b.maxPercent),
    }));

  const scaleLabel =
    scaleSource === "inferred"
      ? "Learned from your school's percentage ↔ letter marks"
      : "Standard A–F style scale (override)";

  return {
    buckets,
    modeUsed: "letter",
    scaleSource,
    scaleLabel,
    gradedCount: graded.length,
    averagePercent:
      percentCount > 0 ? Math.round((percentSum / percentCount) * 10) / 10 : null,
    letterGradeCoverage: graded.length ? withLetter / graded.length : 0,
  };
}

export function buildGradeDistribution(
  assessments: Assessment[],
  mode: DistributionMode = "auto",
): GradeDistributionResult {
  const graded = assessments.filter(isGradedAssessment);
  if (!graded.length) {
    return {
      buckets: [],
      modeUsed: "percent",
      scaleSource: "percent",
      scaleLabel: "Percentage bands",
      gradedCount: 0,
      averagePercent: null,
      letterGradeCoverage: 0,
    };
  }

  const inferred = inferLetterGradeScale(graded);
  const effective = resolveEffectiveMode(mode, inferred, graded);

  if (effective === "letter") {
    return buildLetterDistribution(graded, inferred, mode === "letter" && !inferred);
  }
  return buildPercentDistribution(graded);
}
