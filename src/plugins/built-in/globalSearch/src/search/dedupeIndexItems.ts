import type { CombinedResult } from "../core/types";
import type { IndexItem } from "../indexing/types";

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Same SPA destination as handlers for `course` / `subjectcourse` / passive `courses`. */
function shouldDedupeAsSameCourseSPA(item: IndexItem): boolean {
  if (item.actionId === "subjectassessment") return false;
  if (item.metadata?.type === "assessments") return false;

  if (item.renderComponentId === "course") return true;
  if (item.actionId === "course") return true;
  if (item.actionId === "subjectcourse") return true;
  if (
    item.actionId === "passive" &&
    item.metadata?.sourcePage === "/courses"
  ) {
    return true;
  }
  return false;
}

export function courseDestinationKey(item: IndexItem): string | undefined {
  if (!shouldDedupeAsSameCourseSPA(item)) return undefined;
  const md = item.metadata ?? {};
  const programme = toFiniteNumber(
    md.programme ?? md.programmeId ?? md.programmeID,
  );
  const metaclass = toFiniteNumber(
    md.metaclass ?? md.metaclassId ?? md.metaclassID ?? md.subjectId,
  );
  if (programme === undefined || metaclass === undefined) return undefined;
  return `course:${programme}:${metaclass}`;
}

function shouldDedupeAsSameAssessmentSPA(item: IndexItem): boolean {
  if (item.actionId === "assessment") return true;
  if (item.actionId !== "passive") return false;

  const md = item.metadata ?? {};
  const route = typeof md.route === "string" ? md.route.toLowerCase() : "";
  if (route.includes("/assessment/list/")) return true;

  const cat = item.category?.toLowerCase();
  return cat === "past" || cat === "upcoming";
}

export function assessmentDestinationKey(item: IndexItem): string | undefined {
  if (!shouldDedupeAsSameAssessmentSPA(item)) return undefined;
  const md = item.metadata ?? {};
  const assessmentId = toFiniteNumber(
    md.assessmentId ?? md.assessmentID ?? md.entityId,
  );
  if (assessmentId === undefined) return undefined;
  return `assessment:${assessmentId}`;
}

function searchDedupeKey(item: IndexItem): string | undefined {
  return courseDestinationKey(item) ?? assessmentDestinationKey(item);
}

function isPassiveLike(item: IndexItem): boolean {
  return (
    item.actionId === "passive" || item.metadata?.source === "passive"
  );
}

function hasProgrammeMetaclass(item: IndexItem): boolean {
  const md = item.metadata ?? {};
  const programme = toFiniteNumber(
    md.programme ?? md.programmeId ?? md.programmeID,
  );
  const metaclass = toFiniteNumber(
    md.metaclass ?? md.metaclassId ?? md.metaclassID ?? md.subjectId,
  );
  return programme !== undefined && metaclass !== undefined;
}

function pickBetterCourseNavDuplicate(a: IndexItem, b: IndexItem): IndexItem {
  const aP = isPassiveLike(a);
  const bP = isPassiveLike(b);
  if (aP && !bP) return b;
  if (!aP && bP) return a;
  // Prefer curated job row (courses store) vs other categories
  if (a.category === "courses" && b.category !== "courses") return a;
  if (b.category === "courses" && a.category !== "courses") return b;
  if (a.renderComponentId === "course" && b.renderComponentId !== "course")
    return a;
  if (b.renderComponentId === "course" && a.renderComponentId !== "course")
    return b;
  const ad = typeof a.dateAdded === "number" ? a.dateAdded : 0;
  const bd = typeof b.dateAdded === "number" ? b.dateAdded : 0;
  return ad >= bd ? a : b;
}

function pickBetterAssessmentDuplicate(a: IndexItem, b: IndexItem): IndexItem {
  const aP = isPassiveLike(a);
  const bP = isPassiveLike(b);
  if (aP && !bP) return b;
  if (!aP && bP) return a;

  if (a.category === "assignments" && b.category !== "assignments") return a;
  if (b.category === "assignments" && a.category !== "assignments") return b;

  const aPm = hasProgrammeMetaclass(a);
  const bPm = hasProgrammeMetaclass(b);
  if (aPm && !bPm) return a;
  if (!aPm && bPm) return b;

  const ad = typeof a.dateAdded === "number" ? a.dateAdded : 0;
  const bd = typeof b.dateAdded === "number" ? b.dateAdded : 0;
  return ad >= bd ? a : b;
}

function pickBetterSearchDuplicate(
  a: IndexItem,
  b: IndexItem,
  key: string,
): IndexItem {
  if (key.startsWith("assessment:")) {
    return pickBetterAssessmentDuplicate(a, b);
  }
  return pickBetterCourseNavDuplicate(a, b);
}

/**
 * Collapses multiple index rows that open the same course or assessment hash
 * route (e.g. `course` job + passive `/load/courses`, or assignments job +
 * passive `/assessment/list/past`) so search shows one hit.
 */
export function dedupeIndexItemsForSearch(items: IndexItem[]): IndexItem[] {
  const winners = new Map<string, IndexItem>();

  for (const item of items) {
    const key = searchDedupeKey(item);
    if (!key) continue;
    const prev = winners.get(key);
    winners.set(
      key,
      prev ? pickBetterSearchDuplicate(prev, item, key) : item,
    );
  }

  const seenCanon = new Set<string>();
  const out: IndexItem[] = [];

  for (const item of items) {
    const key = searchDedupeKey(item);
    if (!key) {
      out.push(item);
      continue;
    }
    if (seenCanon.has(key)) continue;
    seenCanon.add(key);
    out.push(winners.get(key)!);
  }

  return out;
}

function dynamicSearchKey(row: CombinedResult): string | undefined {
  if (row.type !== "dynamic") return undefined;
  return searchDedupeKey(row.item as IndexItem);
}

/**
 * Final pass after hybrid expansion: vector-only recall can still surface a
 * second row for the same SPA route using a stale passive id.
 */
export function dedupeCombinedResultsByCourseNav(
  results: CombinedResult[],
): CombinedResult[] {
  const best = new Map<string, CombinedResult>();

  for (const r of results) {
    const key = dynamicSearchKey(r);
    if (!key) continue;
    const prev = best.get(key);
    if (!prev) {
      best.set(key, r);
      continue;
    }
    const aItem = prev.item as IndexItem;
    const bItem = r.item as IndexItem;
    const winnerItem = pickBetterSearchDuplicate(aItem, bItem, key);
    const envelope = winnerItem.id === aItem.id ? prev : r;
    best.set(key, {
      ...envelope,
      score: Math.max(prev.score, r.score),
      id: winnerItem.id,
      item: winnerItem,
    });
  }

  const seenCanon = new Set<string>();
  const out: CombinedResult[] = [];

  for (const r of results) {
    const key = dynamicSearchKey(r);
    if (!key) {
      out.push(r);
      continue;
    }
    if (seenCanon.has(key)) continue;
    seenCanon.add(key);
    out.push(best.get(key)!);
  }

  return out;
}
