import {
  approximatePercentFromLetterGrade,
  extractLetterGradeStringFromPayload,
} from "../gradeAnalytics/letterGradeScale";

export interface OverviewSubject {
  code: string;
  programme: number;
  metaclass: number;
  title: string;
}

function isActiveTermFlag(active: unknown): boolean {
  return active === 1 || active === true;
}

export function normalizeOverviewSubject(raw: unknown): OverviewSubject | null {
  if (!raw || typeof raw !== "object") return null;

  const subject = raw as Record<string, unknown>;
  const programme = Number(subject.programme ?? subject.programmeID);
  const metaclass = Number(subject.metaclass ?? subject.metaclassID);
  if (!programme || !metaclass || Number.isNaN(programme) || Number.isNaN(metaclass)) {
    return null;
  }

  const code = String(subject.code ?? subject.subject ?? "").trim();
  if (!code) return null;

  return {
    code,
    programme,
    metaclass,
    title: String(subject.title ?? subject.description ?? code),
  };
}

/** Subjects from the active programme-year folder(s) in `/seqta/student/load/subjects`. */
export function activeSubjectsFromLearnPayload(payload: unknown): OverviewSubject[] {
  if (!Array.isArray(payload)) return [];

  const subjects: OverviewSubject[] = [];
  const seen = new Set<string>();

  for (const folder of payload) {
    if (!folder || typeof folder !== "object") continue;
    const term = folder as { active?: unknown; subjects?: unknown[] };
    if (!isActiveTermFlag(term.active) || !Array.isArray(term.subjects)) continue;

    for (const raw of term.subjects) {
      const subject = normalizeOverviewSubject(raw);
      if (!subject) continue;
      const key = `${subject.programme}-${subject.metaclass}`;
      if (seen.has(key)) continue;
      seen.add(key);
      subjects.push(subject);
    }
  }

  return subjects;
}

export function activeSubjectsFromEngageChild(child: {
  terms?: { active?: number; subjects?: unknown[] }[];
}): OverviewSubject[] {
  const subjects: OverviewSubject[] = [];
  const seen = new Set<string>();

  for (const term of child.terms ?? []) {
    if (!isActiveTermFlag(term.active)) continue;
    for (const raw of term.subjects ?? []) {
      const subject = normalizeOverviewSubject(raw);
      if (!subject) continue;
      const key = `${subject.programme}-${subject.metaclass}`;
      if (seen.has(key)) continue;
      seen.add(key);
      subjects.push(subject);
    }
  }

  return subjects;
}

export function assessmentBelongsToActiveSubjects(
  assessment: Record<string, unknown>,
  activeSubjects: OverviewSubject[],
): boolean {
  if (!activeSubjects.length) return false;

  const programme = Number(assessment.programmeID ?? assessment.programme);
  const metaclass = Number(assessment.metaclassID ?? assessment.metaclass);

  if (programme && metaclass && !Number.isNaN(programme) && !Number.isNaN(metaclass)) {
    return activeSubjects.some(
      (subject) => subject.programme === programme && subject.metaclass === metaclass,
    );
  }

  const code = String(assessment.code ?? assessment.subject ?? "").trim();
  if (!code) return false;
  return activeSubjects.some((subject) => subject.code === code);
}

export function activeSubjectForAssessment(
  assessment: Record<string, unknown>,
  activeSubjects: OverviewSubject[],
): OverviewSubject | undefined {
  const programme = Number(assessment.programmeID ?? assessment.programme);
  const metaclass = Number(assessment.metaclassID ?? assessment.metaclass);

  if (programme && metaclass && !Number.isNaN(programme) && !Number.isNaN(metaclass)) {
    const subject = activeSubjects.find(
      (s) => s.programme === programme && s.metaclass === metaclass,
    );
    if (subject) return subject;
  }

  const code = String(assessment.code ?? assessment.subject ?? "").trim();
  if (!code) return undefined;
  return activeSubjects.find((s) => s.code === code);
}

export function filterAssessmentsForActiveSubjects<T extends Record<string, unknown>>(
  assessments: T[],
  activeSubjects: OverviewSubject[],
): T[] {
  return assessments.filter((assessment) =>
    assessmentBelongsToActiveSubjects(assessment, activeSubjects),
  );
}

/** Active subjects that have at least one assessment in the given list. */
export function subjectsWithUpcomingAssessments(
  assessments: Record<string, unknown>[],
  activeSubjects: OverviewSubject[],
): OverviewSubject[] {
  const result: OverviewSubject[] = [];
  const seen = new Set<string>();

  for (const assessment of assessments) {
    const subject = activeSubjectForAssessment(assessment, activeSubjects);
    if (!subject || seen.has(subject.code)) continue;
    seen.add(subject.code);
    result.push(subject);
  }

  return result;
}

export function formatDate(dateStr: string, submitted?: boolean): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffTime = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0 && !submitted) {
    const overdueDays = Math.abs(diffDays);
    if (overdueDays === 1) return "1 day overdue";
    return `${overdueDays} days overdue`;
  }

  if (diffDays === 0) return "Today";

  if (diffDays === 1) return "Tomorrow";

  if (diffDays <= 7) {
    const weekdayName = d.toLocaleDateString(undefined, { weekday: "long" });

    return diffDays < 0 ? `Last ${weekdayName}` : weekdayName;
  }

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function readStoredList(key: string): unknown[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export type OverviewAssessment = Record<string, unknown>;

function readNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function readNestedRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

export function determineStatus(item: OverviewAssessment, completed: readonly unknown[]): string {
  if (
    item.status === "MARKS_RELEASED" ||
    item.grade ||
    (item.percentage !== undefined && item.percentage !== null) ||
    (item.achieved !== undefined && item.achieved !== null)
  ) {
    return "MARKS_RELEASED";
  }

  if (completed.includes(item.id)) {
    return "MARKS_RELEASED";
  }

  if (item.submitted) {
    return "SUBMITTED";
  }

  const now = new Date();
  const due = new Date(String(item.due ?? ""));

  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "OVERDUE";
  }

  if (diffDays <= 7) {
    return "DUE_SOON";
  }

  return "UPCOMING";
}

export function getGradeValue(assessment: OverviewAssessment): number | null {
  const results = readNestedRecord(assessment.results);

  const fromResultsPct = readNumber(results?.percentage);
  if (fromResultsPct !== null) return fromResultsPct;

  const fromPct = readNumber(assessment.percentage);
  if (fromPct !== null) return fromPct;

  const achieved = readNumber(assessment.achieved);
  const outOf = readNumber(assessment.outOf);
  if (achieved !== null && outOf !== null && outOf > 0) {
    return (achieved / outOf) * 100;
  }

  const resAchieved = readNumber(results?.achieved);
  const resOutOf = readNumber(results?.outOf);
  if (resAchieved !== null && resOutOf !== null && resOutOf > 0) {
    return (resAchieved / resOutOf) * 100;
  }

  return null;
}

export function extractAssessmentLetterGrade(assessment: OverviewAssessment): string | undefined {
  if (assessment?.grade != null && String(assessment.grade).trim() !== "") {
    return String(assessment.grade).trim();
  }
  return extractLetterGradeStringFromPayload(
    assessment as Parameters<typeof extractLetterGradeStringFromPayload>[0],
  );
}

export function percentageToLetterGrade(percentage: number): string {
  const letterMap: Record<number, string> = {
    100: "A+",
    95: "A",
    90: "A-",
    85: "B+",
    80: "B",
    75: "B-",
    70: "C+",
    65: "C",
    60: "C-",
    55: "D+",
    50: "D",
    45: "D-",
    40: "E+",
    35: "E",
    30: "E-",
    0: "F",
  };

  const rounded = Math.ceil(percentage / 5) * 5;
  return letterMap[rounded] || "F";
}

export function getThermoscorePercent(assessment: OverviewAssessment): number | null {
  const numeric = getGradeValue(assessment);
  if (numeric !== null) return numeric;

  const letter = extractAssessmentLetterGrade(assessment);
  if (letter) {
    const approx = approximatePercentFromLetterGrade(letter);
    if (approx !== undefined) return approx;
  }

  return null;
}

export function getDisplayGrade(assessment: OverviewAssessment, letterGradeMode: boolean): string {
  if (letterGradeMode) {
    const letter = extractAssessmentLetterGrade(assessment);
    if (letter) return letter;

    const val = getGradeValue(assessment);
    if (val !== null) return percentageToLetterGrade(val);

    return "No grade";
  }

  const val = getGradeValue(assessment);
  if (val !== null) return `${val}%`;

  const letter = extractAssessmentLetterGrade(assessment);
  if (letter) return letter;

  return "No grade";
}

export function assessmentHasGradeDisplay(assessment: OverviewAssessment): boolean {
  if (extractAssessmentLetterGrade(assessment)) return true;
  if (getGradeValue(assessment) !== null) return true;
  return false;
}
