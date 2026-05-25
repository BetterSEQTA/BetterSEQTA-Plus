import type { IndexItem, Job } from "../types";
import { seqtaFetchPayload } from "../api";
import { buildIndexItem } from "../extract";
import { htmlToPlainText } from "../utils";

/**
 * Indexes per-subject course content from `/seqta/student/load/courses`.
 *
 * The course payload contains the lesson grid in `w[][]` where each cell's
 * `l` field is a (possibly empty) HTML snippet authored by teachers. We
 * concatenate these into searchable text per course, plus the course title
 * and code from `t` / `c`. Embedded files referenced via TED/SEQTA URLs are
 * preserved as plain-text links so users can find them by URL fragment.
 */

interface SubjectsListPayload {
  code: string;
  description?: string;
  active: number;
  subjects: Array<{
    code: string;
    title?: string;
    description?: string;
    metaclass: number;
    programme: number;
  }>;
}

interface CoursePayload {
  c?: string;
  t?: string;
  i?: number;
  m?: number;
  w?: Array<Array<{ l?: string; h?: string; t?: string; o?: string; i?: number }>>;
  document?: string;
}

const fetchActiveSubjects = async (): Promise<
  SubjectsListPayload["subjects"]
> => {
  const payload = await seqtaFetchPayload<SubjectsListPayload[]>(
    "/seqta/student/load/subjects",
    {},
  );
  if (!Array.isArray(payload)) return [];

  const out: SubjectsListPayload["subjects"] = [];
  for (const semester of payload) {
    if (!semester || !Array.isArray(semester.subjects)) continue;
    if (semester.active !== 1) continue;
    for (const subject of semester.subjects) {
      if (
        subject &&
        Number.isFinite(subject.programme) &&
        Number.isFinite(subject.metaclass)
      ) {
        out.push(subject);
      }
    }
  }
  return out;
};

function flattenLessonHtml(payload: CoursePayload): string {
  if (!Array.isArray(payload.w)) return "";
  const fragments: string[] = [];
  for (const row of payload.w) {
    if (!Array.isArray(row)) continue;
    for (const cell of row) {
      if (!cell) continue;
      if (typeof cell.l === "string" && cell.l.trim()) {
        fragments.push(cell.l);
      }
      if (typeof cell.h === "string" && cell.h.trim()) {
        fragments.push(cell.h);
      }
      if (typeof cell.t === "string" && cell.t.trim()) {
        fragments.push(cell.t);
      }
      if (typeof cell.o === "string" && cell.o.trim()) {
        fragments.push(cell.o);
      }
    }
  }
  if (fragments.length === 0) return "";
  return htmlToPlainText(fragments.join("\n"));
}

export const coursesJob: Job = {
  id: "courses",
  label: "Courses",
  renderComponentId: "course",
  // Course content rarely changes minute-to-minute but does evolve per term.
  // Refresh once per day (after pageLoad cool-down) to keep new lessons
  // discoverable without hammering SEQTA.
  frequency: { type: "expiry", afterMs: 1000 * 60 * 60 * 24 },

  boostCriteria: (item, searchTerm) => {
    if (!searchTerm) return -50;
    let score = 0;
    if (item.metadata?.subjectCode) score += 0.05;
    if (item.metadata?.isActive) score += 0.02;
    return score;
  },

  run: async (_ctx) => {
    const subjects = await fetchActiveSubjects();
    if (subjects.length === 0) {
      console.debug("[Courses job] No active subjects discovered.");
      return [];
    }

    const items: IndexItem[] = [];
    const seenIds = new Set<string>();

    // Sequential per-subject fetch keeps load on SEQTA bounded; the shared
    // API layer also limits concurrency per route as a defense in depth.
    for (const subject of subjects) {
      const id = `course-${subject.programme}-${subject.metaclass}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const payload = await seqtaFetchPayload<CoursePayload>(
        "/seqta/student/load/courses",
        {
          programme: String(subject.programme),
          metaclass: String(subject.metaclass),
        },
      );

      if (!payload) continue;

      const title =
        (typeof payload.t === "string" && payload.t.trim()) ||
        subject.title ||
        subject.description ||
        subject.code ||
        "Course";

      const lessonText = flattenLessonHtml(payload);
      const courseCode =
        (typeof payload.c === "string" && payload.c.trim()) || subject.code;

      const summary = [courseCode, lessonText]
        .filter((s) => s && s.length > 0)
        .join("\n")
        .slice(0, 4000);

      items.push(
        buildIndexItem({
          id,
          text: title,
          category: "courses",
          contentOverride: summary || `Course content for ${title}`,
          metadata: {
            subjectCode: subject.code,
            subjectName: subject.title ?? title,
            programme: subject.programme,
            metaclass: subject.metaclass,
            courseCode,
            isActive: true,
            route: `/courses/${subject.programme}:${subject.metaclass}`,
            entityType: "course",
            icon: "\ueb4d",
          },
          actionId: "course",
          renderComponentId: "course",
        }),
      );
    }

    console.debug(
      `[Courses job] Indexed ${items.length} courses across ${subjects.length} subjects.`,
    );
    return items;
  },

  purge: (items) => items,
};
