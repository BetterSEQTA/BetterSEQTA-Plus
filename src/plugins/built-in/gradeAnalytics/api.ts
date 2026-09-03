import { getUserInfo } from "@/seqta/ui/AddBetterSEQTAElements";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { getMockGradeAnalyticsData } from "@/seqta/ui/dev/hideSensitiveContent";
import {
  extractLetterGradeStringFromPayload,
  resolveNumericGradeFromAssessmentPayload,
} from "./letterGradeScale";
import { loadAnalyticsCache, saveAnalyticsCache } from "./storage";
import type { Assessment, AssessmentStatus, AnalyticsClassOption } from "./types";

const PAST_FETCH_CONCURRENCY = 8;
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface Subject {
  code: string;
  programme: number;
  metaclass: number;
}

async function fetchJSON(url: string, body: Record<string, unknown>) {
  const res = await fetch(`${location.origin}${url}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

export function parseAssessment(data: unknown): Assessment | null {
  try {
    if (!data || typeof data !== "object") return null;
    const raw = data as Record<string, unknown>;

    const letterGrade = extractLetterGradeStringFromPayload(
      raw as Parameters<typeof extractLetterGradeStringFromPayload>[0],
    );
    let finalGrade = resolveNumericGradeFromAssessmentPayload(
      raw as Parameters<typeof resolveNumericGradeFromAssessmentPayload>[0],
    );
    if (
      finalGrade !== undefined &&
      (typeof finalGrade !== "number" || isNaN(finalGrade))
    ) {
      finalGrade = undefined;
    }

    const assessment: Assessment = {
      id: Number(raw.id),
      title: String(raw.title || ""),
      subject: String(raw.subject || raw.code || ""),
      status: String(raw.status || "PENDING") as AssessmentStatus,
      due: String(raw.due || raw.date || raw.dueDate || ""),
      code: String(raw.code || raw.subject || ""),
      metaclassID: Number(raw.metaclassID ?? raw.metaclass ?? 0),
      programmeID: Number(raw.programmeID ?? raw.programme ?? 0),
      graded: Boolean(raw.graded),
      overdue: Boolean(raw.overdue),
      hasFeedback: Boolean(raw.hasFeedback),
      reflectionsEnabled: Boolean(raw.reflectionsEnabled),
      reflectionsCompleted: Boolean(raw.reflectionsCompleted),
      expectationsEnabled: Boolean(raw.expectationsEnabled),
      expectationsCompleted: Boolean(raw.expectationsCompleted),
      availability: String(raw.availability || ""),
      finalGrade,
      letterGrade,
    };

    if (
      !assessment.id ||
      !assessment.title ||
      !assessment.subject ||
      !isValidDate(assessment.due)
    ) {
      return null;
    }

    return assessment;
  } catch {
    return null;
  }
}

function jsonGradeToString(grade: unknown): string | undefined {
  if (typeof grade === "string") return grade.trim() || undefined;
  if (typeof grade === "number") return String(grade);
  return undefined;
}

function extractFinalGrade(assessment: Record<string, unknown>): number | undefined {
  if (assessment.status !== "MARKS_RELEASED") return undefined;

  const criteria = assessment.criteria as
    | { results?: { percentage?: unknown } }[]
    | undefined;
  if (criteria?.[0]?.results?.percentage !== undefined) {
    const n = Number(criteria[0].results!.percentage);
    if (!isNaN(n)) return n;
  }

  const results = assessment.results as { percentage?: unknown } | undefined;
  if (results?.percentage !== undefined) {
    const n = Number(results.percentage);
    if (!isNaN(n)) return n;
  }

  if (assessment.finalGrade !== undefined && assessment.finalGrade !== null) {
    const n = Number(assessment.finalGrade);
    if (!isNaN(n)) return n;
  }

  const letter = extractLetterGradeStringFromPayload(
    assessment as Parameters<typeof extractLetterGradeStringFromPayload>[0],
  );
  if (letter) {
    const approx = resolveNumericGradeFromAssessmentPayload({
      status: "MARKS_RELEASED",
      letterGrade: letter,
    });
    if (approx !== undefined) return approx;
  }

  return undefined;
}

function extractLetterGrade(
  assessment: Record<string, unknown>,
): string | undefined {
  if (assessment.status !== "MARKS_RELEASED") return undefined;

  const criteria = assessment.criteria as
    | { results?: { grade?: unknown } }[]
    | undefined;
  const c0 = criteria?.[0]?.results?.grade;
  const fromCriteria = jsonGradeToString(c0);
  if (fromCriteria) return fromCriteria;

  const results = assessment.results as { grade?: unknown } | undefined;
  const fromResults = jsonGradeToString(results?.grade);
  if (fromResults) return fromResults;

  return extractLetterGradeStringFromPayload(
    assessment as Parameters<typeof extractLetterGradeStringFromPayload>[0],
  );
}

function classKey(programme: number, metaclass: number): string {
  return `${programme}-${metaclass}`;
}

function folderYearLabel(description: unknown): string {
  const text = String(description ?? "").trim();
  const match = text.match(/\b(20\d{2})\b/);
  return match?.[1] ?? (text || "?");
}

function parseClassOption(raw: unknown, yearLabel: string): AnalyticsClassOption | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const programme = Number(row.programme ?? row.programmeID);
  const metaclass = Number(row.metaclass ?? row.metaclassID);
  if (!programme || !metaclass || Number.isNaN(programme) || Number.isNaN(metaclass)) {
    return null;
  }
  const title = String(row.title ?? row.description ?? row.code ?? row.subject ?? "").trim();
  if (!title) return null;
  return {
    key: classKey(programme, metaclass),
    title,
    yearLabel,
    programme,
    metaclass,
  };
}

function parseClassOptionsFromPayload(payload: unknown): AnalyticsClassOption[] {
  if (!Array.isArray(payload)) return [];
  const map = new Map<string, AnalyticsClassOption>();
  for (const folder of payload) {
    if (!folder || typeof folder !== "object") continue;
    const term = folder as { description?: unknown; code?: unknown; subjects?: unknown[] };
    const yearLabel = folderYearLabel(term.description ?? term.code);
    for (const raw of term.subjects ?? []) {
      const option = parseClassOption(raw, yearLabel);
      if (option) map.set(option.key, option);
    }
  }
  return sortClassOptions([...map.values()]);
}

function classOptionsFromAssessments(assessments: Assessment[]): AnalyticsClassOption[] {
  const map = new Map<string, AnalyticsClassOption>();
  for (const a of assessments) {
    if (!a.programmeID || !a.metaclassID) continue;
    const key = classKey(a.programmeID, a.metaclassID);
    if (map.has(key)) continue;
    map.set(key, {
      key,
      title: a.subject || a.code,
      yearLabel: a.due ? String(new Date(a.due).getFullYear()) : "?",
      programme: a.programmeID,
      metaclass: a.metaclassID,
    });
  }
  return [...map.values()];
}

function sortClassOptions(options: AnalyticsClassOption[]): AnalyticsClassOption[] {
  return [...options].sort((a, b) => {
    const yearA = Number.parseInt(a.yearLabel, 10);
    const yearB = Number.parseInt(b.yearLabel, 10);
    if (!Number.isNaN(yearA) && !Number.isNaN(yearB) && yearA !== yearB) {
      return yearB - yearA;
    }
    if (a.yearLabel !== b.yearLabel) {
      return a.yearLabel.localeCompare(b.yearLabel, undefined, { sensitivity: "base" });
    }
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
}

function mergeClassCatalog(
  folderPayload: unknown,
  assessments: Assessment[],
): AnalyticsClassOption[] {
  const map = new Map<string, AnalyticsClassOption>();
  for (const option of parseClassOptionsFromPayload(folderPayload)) {
    map.set(option.key, option);
  }
  for (const option of classOptionsFromAssessments(assessments)) {
    map.set(option.key, option);
  }
  return sortClassOptions([...map.values()]);
}

function catalogToSubjects(catalog: AnalyticsClassOption[]): Subject[] {
  return catalog.map((c) => ({
    code: c.title,
    programme: c.programme,
    metaclass: c.metaclass,
  }));
}

async function loadAllSubjects(existingAssessments: Assessment[] = []): Promise<Subject[]> {
  const catalog = await loadAnalyticsClassCatalog(existingAssessments);
  return catalogToSubjects(catalog);
}

/** All programme-year classes for combine-groups UI (active + inactive folders). */
export async function loadAnalyticsClassCatalog(
  existingAssessments: Assessment[] = [],
): Promise<AnalyticsClassOption[]> {
  try {
    const res = await fetchJSON("/seqta/student/load/subjects?", {});
    return mergeClassCatalog(res.payload, existingAssessments);
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to load analytics class catalog:", error);
    return sortClassOptions(classOptionsFromAssessments(existingAssessments));
  }
}

async function loadUpcoming(studentId: number): Promise<Record<string, unknown>[]> {
  const res = await fetchJSON("/seqta/student/assessment/list/upcoming?", {
    student: studentId,
  });
  return Array.isArray(res.payload) ? res.payload : [];
}

async function loadPastForSubject(
  studentId: number,
  subject: Subject,
): Promise<Record<string, unknown>[]> {
  const res = await fetchJSON("/seqta/student/assessment/list/past?", {
    programme: subject.programme,
    metaclass: subject.metaclass,
    student: studentId,
  });
  const items: Record<string, unknown>[] = [];
  const process = (assessment: unknown) => {
    if (!assessment || typeof assessment !== "object") return;
    const a = assessment as Record<string, unknown>;
    if (!a.id) return;
    items.push({
      ...a,
      programmeID: a.programmeID ?? a.programme ?? subject.programme,
      metaclassID: a.metaclassID ?? a.metaclass ?? subject.metaclass,
      code: a.code ?? a.subject ?? subject.code,
    });
  };
  if (Array.isArray(res.payload?.pending)) {
    res.payload.pending.forEach(process);
  }
  if (Array.isArray(res.payload?.tasks)) {
    res.payload.tasks.forEach(process);
  }
  return items;
}

async function loadAllPast(
  studentId: number,
  subjects: Subject[],
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[][] = [];
  for (let i = 0; i < subjects.length; i += PAST_FETCH_CONCURRENCY) {
    const batch = subjects.slice(i, i + PAST_FETCH_CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map((s) => loadPastForSubject(studentId, s)),
    );
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        console.error(
          "[BetterSEQTA+] Past assessments fetch failed:",
          result.reason,
        );
      }
    }
  }
  return results.flat();
}

function mergeRawAssessments(
  existing: Assessment[],
  rawItems: Record<string, unknown>[],
): Assessment[] {
  const existingMap = new Map<number, Assessment>();
  for (const a of existing) {
    existingMap.set(a.id, a);
  }

  for (const raw of rawItems) {
    const id = Number(raw.id);
    if (!id) continue;

    const finalGrade = extractFinalGrade(raw);
    const letterGrade = extractLetterGrade(raw);
    if (finalGrade !== undefined) raw.finalGrade = finalGrade;
    if (letterGrade !== undefined) raw.letterGrade = letterGrade;

    const existingItem = existingMap.get(id);
    if (existingItem?.finalGrade !== undefined && finalGrade === undefined) {
      continue;
    }

    const parsed = parseAssessment(raw);
    if (parsed) existingMap.set(id, parsed);
  }

  return Array.from(existingMap.values()).sort(
    (a, b) => new Date(b.due).getTime() - new Date(a.due).getTime(),
  );
}

export async function getStudentId(): Promise<number> {
  const info = await getUserInfo({ validateSession: true });
  const id = Number(info?.id);
  if (!id || isNaN(id)) throw new Error("Could not resolve student ID");
  return id;
}

export function getCacheTtlMs(cacheTtlHours = 24): number {
  return cacheTtlHours * 60 * 60 * 1000;
}

export async function loadGradeAnalytics(
  cacheTtlMs = getCacheTtlMs(),
): Promise<{ assessments: Assessment[]; updatedAt: number | null; fromCache: boolean }> {
  if (settingsState.hideSensitiveContent) {
    const mock = getMockGradeAnalyticsData();
    return { assessments: mock, updatedAt: Date.now(), fromCache: false };
  }

  const studentId = await getStudentId();
  const cached = await loadAnalyticsCache(location.origin, studentId);
  if (cached) {
    const stale = Date.now() - cached.updatedAt > cacheTtlMs;
    return {
      assessments: cached.assessments,
      updatedAt: cached.updatedAt,
      fromCache: !stale,
    };
  }

  return { assessments: [], updatedAt: null, fromCache: false };
}

export async function syncGradeAnalytics(): Promise<{
  assessments: Assessment[];
  updatedAt: number;
}> {
  if (settingsState.hideSensitiveContent) {
    const mock = getMockGradeAnalyticsData();
    return { assessments: mock, updatedAt: Date.now() };
  }

  const studentId = await getStudentId();
  const cached = await loadAnalyticsCache(location.origin, studentId);
  const existing = cached?.assessments ?? [];

  const subjectList = await loadAllSubjects(existing);

  const [upcoming, past] = await Promise.all([
    loadUpcoming(studentId),
    loadAllPast(studentId, subjectList),
  ]);

  const merged = mergeRawAssessments(existing, [...upcoming, ...past]);
  await saveAnalyticsCache(location.origin, studentId, merged);

  return { assessments: merged, updatedAt: Date.now() };
}
