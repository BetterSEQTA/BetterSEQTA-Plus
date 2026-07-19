/**
 * When SEQTA only reports letter bands (no percentage), map to approximate 0–100
 * so analytics charts can run. Conventional scale, not official school conversion.
 */
const LETTER_TO_APPROX_PERCENT: Record<string, number> = {
  "a+": 95,
  a: 85,
  "a-": 80,
  "b+": 75,
  b: 68,
  "b-": 62,
  "c+": 58,
  c: 55,
  "c-": 50,
  "d+": 48,
  d: 45,
  "d-": 42,
  e: 38,
  f: 32,
  hd: 95,
  cr: 60,
  p: 55,
  ps: 55,
  n: 35,
  pass: 55,
  fail: 32,
};

function normalizeLetterKey(raw: string): string {
  const s = raw.trim().toLowerCase();
  const first = s.split(/[\s(/]/)[0] ?? s;
  return first.replace(/[^a-z+-]/gi, "") || s;
}

export function approximatePercentFromLetterGrade(
  letter: string | null | undefined,
): number | undefined {
  if (letter == null) return undefined;
  const t = String(letter).trim();
  if (!t) return undefined;
  if (/^\d+(\.\d+)?$/.test(t)) {
    const n = parseFloat(t);
    if (!isNaN(n) && n >= 0 && n <= 100) return n;
  }
  const key = normalizeLetterKey(t);
  if (LETTER_TO_APPROX_PERCENT[key] !== undefined)
    return LETTER_TO_APPROX_PERCENT[key];
  if (t.length === 1 && /^[a-f]$/i.test(t)) {
    const single = t.toLowerCase() as keyof typeof LETTER_TO_APPROX_PERCENT;
    if (LETTER_TO_APPROX_PERCENT[single] !== undefined)
      return LETTER_TO_APPROX_PERCENT[single];
  }
  return undefined;
}

export function extractLetterGradeStringFromPayload(data: {
  criteria?: { results?: { grade?: unknown } }[];
  results?: { grade?: unknown };
  letterGrade?: unknown;
  extra?: Record<string, unknown>;
}): string | undefined {
  const merged: Record<string, unknown> = {
    ...(data?.extra && typeof data.extra === "object" ? data.extra : {}),
    ...data,
  };
  if (merged.letterGrade != null && String(merged.letterGrade).trim() !== "") {
    return String(merged.letterGrade).trim();
  }
  const criteria = merged.criteria as
    | { results?: { grade?: unknown } }[]
    | undefined;
  const c0 = criteria?.[0]?.results?.grade;
  if (c0 != null && String(c0).trim() !== "") return String(c0).trim();
  const r = (merged.results as { grade?: unknown } | undefined)?.grade;
  if (r != null && String(r).trim() !== "") return String(r).trim();
  return undefined;
}

export function resolveNumericGradeFromAssessmentPayload(data: {
  status?: string;
  finalGrade?: unknown;
  criteria?: { results?: { percentage?: unknown; grade?: unknown } }[];
  results?: { percentage?: unknown; grade?: unknown };
  letterGrade?: unknown;
  extra?: Record<string, unknown>;
}): number | undefined {
  const merged: Record<string, unknown> = {
    ...(data?.extra && typeof data.extra === "object" ? data.extra : {}),
    ...data,
  };
  if (merged.finalGrade != null && merged.finalGrade !== "") {
    const n = Number(merged.finalGrade);
    if (!isNaN(n)) return n;
  }
  if (merged.status && merged.status !== "MARKS_RELEASED") return undefined;

  const criteria = merged.criteria as
    | { results?: { percentage?: unknown; grade?: unknown } }[]
    | undefined;
  if (criteria?.[0]?.results?.percentage !== undefined) {
    const n = Number(criteria[0].results!.percentage);
    if (!isNaN(n)) return n;
  }
  const results = merged.results as
    | { percentage?: unknown; grade?: unknown }
    | undefined;
  if (results?.percentage !== undefined) {
    const n = Number(results.percentage);
    if (!isNaN(n)) return n;
  }

  const letter = extractLetterGradeStringFromPayload(
    merged as Parameters<typeof extractLetterGradeStringFromPayload>[0],
  );
  return approximatePercentFromLetterGrade(letter);
}
