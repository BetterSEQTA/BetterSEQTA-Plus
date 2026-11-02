import type { IndexItem, Job } from "../types";

import { verboseDebug } from "@/utils/verboseLog";
import { delay } from "@/seqta/utils/delay";
import { getUserInfo } from "@/seqta/utils/userInfo";
import {
  type OverviewAssessment,
  type OverviewSubject,
} from "@/plugins/built-in/assessmentsOverview/utils";

const fetchJSON = async (url: string, body: Record<string, unknown>) => {
  const res = await fetch(`${location.origin}${url}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  return res.json();
};

const fetchUpcomingAssessments = async (student: number) => {
  try {
    const res = await fetchJSON("/seqta/student/assessment/list/upcoming?", {
      student,
    });
    return Array.isArray(res.payload) ? res.payload : [];
  } catch (e) {
    console.error("[Assignments job] Failed to fetch upcoming assessments:", e);
    return [];
  }
};

const fetchSubjects = async () => {
  try {
    const res = await fetchJSON("/seqta/student/load/subjects?", {});
    const payload = res.payload as Record<string, unknown>[] | undefined;
    return (
      payload
        ?.filter((s) => s.active === 1)
        ?.flatMap((s) => (Array.isArray(s.subjects) ? (s.subjects as OverviewSubject[]) : [])) ?? []
    );
  } catch (e) {
    console.error("[Assignments job] Failed to fetch subjects:", e);
    return [];
  }
};

const fetchPastAssessments = async (student: number, subjects: OverviewSubject[]) => {
  const map: Record<number, OverviewAssessment> = {};

  await Promise.all(
    subjects.map(async (subject) => {
      try {
        const res = await fetchJSON("/seqta/student/assessment/list/past?", {
          programme: subject.programme,
          metaclass: subject.metaclass,
          student,
        });

        // Past assessments can come back in payload.tasks, payload.pending, or both.
        const processAssessment = (assessment: OverviewAssessment) => {
          if (assessment && assessment.id != null) {
            const id = Number(assessment.id);
            map[id] = {
              ...assessment,
              programme: assessment.programme || assessment.programmeID || subject.programme,
              programmeID: assessment.programmeID || assessment.programme || subject.programme,
              metaclass: assessment.metaclass || assessment.metaclassID || subject.metaclass,
              metaclassID: assessment.metaclassID || assessment.metaclass || subject.metaclass,
            } as OverviewAssessment;
          }
        };

        if (res.payload?.pending && Array.isArray(res.payload.pending)) {
          res.payload.pending.forEach(processAssessment);
        }

        if (res.payload?.tasks && Array.isArray(res.payload.tasks)) {
          res.payload.tasks.forEach(processAssessment);
        }
      } catch (e) {
        console.warn(
          `[Assignments job] Failed to fetch past assessments for subject ${subject.code || subject.subject || "unknown"}:`,
          e,
        );
      }
    }),
  );

  return Object.values(map);
};

type AssignmentRow = OverviewAssessment & { isUpcoming?: boolean };

function parseOptionalNumericId(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

function buildAssignmentIndexItem(
  assessment: AssignmentRow,
  processedIds: Set<string>,
): IndexItem | null {
  const id = `assignment-${assessment.id}`;

  if (processedIds.has(id)) {
    return null;
  }

  processedIds.add(id);

  const programmeId = assessment.programmeID || assessment.programme;
  const metaclassId = assessment.metaclassID || assessment.metaclass;

  if (!programmeId || !metaclassId || !assessment.id) {
    console.warn(`[Assignments job] Skipping assignment ${assessment.id} - missing required IDs:`, {
      programmeId,
      metaclassId,
      assessmentId: assessment.id,
      programmeID: assessment.programmeID,
      metaclassID: assessment.metaclassID,
      programme: assessment.programme,
      metaclass: assessment.metaclass,
      assessment,
    });
    return null;
  }

  const finalProgrammeId = parseOptionalNumericId(programmeId);
  const finalMetaclassId = parseOptionalNumericId(metaclassId);

  if (finalProgrammeId === undefined || finalMetaclassId === undefined) {
    console.error(
      `[Assignments job] ❌ Skipping assignment ${assessment.id} - invalid IDs after conversion:`,
      {
        programmeId: finalProgrammeId,
        metaclassId: finalMetaclassId,
        assessmentId: assessment.id,
        rawProgrammeId: programmeId,
        rawMetaclassId: metaclassId,
        assessment,
      },
    );
    return null;
  }

  const subjectName = String(assessment.subject || assessment.code || "Unknown Subject");
  const dueDate = assessment.due ? new Date(String(assessment.due)).getTime() : null;

  const item: IndexItem = {
    id,
    text: String(assessment.title || assessment.name || "Untitled Assignment"),
    category: "assignments",
    content: `\nSubject: ${subjectName}\nDue: ${assessment.due || "No due date"}`.trim(),
    dateAdded: dueDate || Date.now(),
    metadata: {
      assessmentId: assessment.id,
      assessmentID: assessment.id,
      subject: subjectName,
      subjectCode: assessment.code,
      dueDate: assessment.due,
      programmeId: finalProgrammeId,
      programmeID: finalProgrammeId,
      metaclassId: finalMetaclassId,
      metaclassID: finalMetaclassId,
      submitted: assessment.submitted || false,
      isUpcoming: assessment.isUpcoming || false,
      term: assessment.term,
      timestamp: assessment.due || new Date().toISOString(),
    },
    actionId: "assessment",
    renderComponentId: "assessment",
  };

  verboseDebug(`[Assignments job] ✅ Created item for assignment ${assessment.id}:`, {
    id: item.id,
    programmeId: item.metadata.programmeId,
    programmeID: item.metadata.programmeID,
    metaclassId: item.metadata.metaclassId,
    metaclassID: item.metadata.metaclassID,
    assessmentId: item.metadata.assessmentId,
    assessmentID: item.metadata.assessmentID,
  });

  return item;
}

export const assignmentsJob: Job = {
  id: "assignments",
  label: "Assignments",
  renderComponentId: "assessment",
  frequency: { type: "expiry", afterMs: 1000 * 60 * 60 * 24 }, // Daily

  boostCriteria: (item, searchTerm) => {
    if (searchTerm === "") {
      return -100;
    }

    let score = 0;

    if (item.metadata.dueDate) {
      const dueDate = new Date(item.metadata.dueDate).getTime();
      const now = Date.now();
      const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);

      if (daysUntilDue >= 0 && daysUntilDue <= 7) {
        score += 0.05; // Boost assignments due within a week
      }
      if (daysUntilDue < 0) {
        score -= 0.1; // Penalty for overdue assignments
      }
    }

    if (item.metadata.submitted) {
      score += 0.02;
    }

    return score;
  },

  run: async (ctx) => {
    // Process every assessment, not just new ones, so metadata stays current.
    const existingItems = await ctx.getStoredItems("assignments");
    const existingIds = new Set(existingItems.map((i) => i.id));

    const { id: student } = await getUserInfo();

    verboseDebug(
      "[Assignments job] Starting indexing - fetching all assessments (upcoming and past)...",
    );

    const [upcoming, subjects] = await Promise.all([
      fetchUpcomingAssessments(student),
      fetchSubjects(),
    ]);

    verboseDebug(
      `[Assignments job] Fetched ${upcoming.length} upcoming assessments and ${subjects.length} subjects`,
    );

    const past = await fetchPastAssessments(student, subjects);

    verboseDebug(`[Assignments job] Fetched ${past.length} past assessments`);

    const subjectLookup = new Map<string, { programme: number; metaclass: number }>();
    subjects.forEach((s: OverviewSubject) => {
      if (s.code && s.programme && s.metaclass) {
        subjectLookup.set(s.code, { programme: s.programme, metaclass: s.metaclass });
      }
    });

    const allAssessments = new Map<number, OverviewAssessment>();

    upcoming.forEach((a: OverviewAssessment) => {
      if (a && a.id) {
        let programme = a.programmeID || a.programme;
        let metaclass = a.metaclassID || a.metaclass;

        if ((!programme || !metaclass) && a.code) {
          const subjectInfo = subjectLookup.get(a.code);
          if (subjectInfo) {
            programme = programme || subjectInfo.programme;
            metaclass = metaclass || subjectInfo.metaclass;
          }
        }

        allAssessments.set(a.id, {
          ...a,
          programme,
          metaclass,
          programmeID: programme, // Ensure both formats are available
          metaclassID: metaclass,
          isUpcoming: true,
        });
      }
    });

    past.forEach((a: OverviewAssessment) => {
      if (a && a.id) {
        let programme = a.programmeID || a.programme;
        let metaclass = a.metaclassID || a.metaclass;

        const existing = allAssessments.get(a.id);
        if (existing) {
          programme = programme || existing.programme || existing.programmeID;
          metaclass = metaclass || existing.metaclass || existing.metaclassID;

          Object.assign(existing, {
            ...a,
            programme,
            metaclass,
            programmeID: programme,
            metaclassID: metaclass,
          });
        } else {
          allAssessments.set(a.id, {
            ...a,
            programme,
            metaclass,
            programmeID: programme,
            metaclassID: metaclass,
            isUpcoming: false,
          });
        }
      }
    });

    const items: IndexItem[] = [];
    const processedIds = new Set<string>();

    const assessmentArray = Array.from(allAssessments.values());
    const pastCount = assessmentArray.filter((a) => !a.isUpcoming).length;
    const upcomingCount = assessmentArray.filter((a) => a.isUpcoming).length;
    verboseDebug(
      `[Assignments job] Processing ${assessmentArray.length} total assessments (${upcomingCount} upcoming, ${pastCount} past)`,
    );
    const batchSize = 15;

    // The assessment details endpoint 404s, so details aren't fetched.

    for (let i = 0; i < assessmentArray.length; i += batchSize) {
      const batch = assessmentArray.slice(i, i + batchSize);

      const batchItems = await Promise.all(
        batch.map(async (assessment) => buildAssignmentIndexItem(assessment, processedIds)),
      );

      batchItems.forEach((item) => {
        if (item) {
          items.push(item);
        }
      });

      if (i + batchSize < assessmentArray.length) {
        await delay(50);
      }
    }

    const newItemsCount = items.filter((item) => !existingIds.has(item.id)).length;
    const updatedItemsCount = items.length - newItemsCount;
    verboseDebug(
      `[Assignments job] Indexed ${items.length} assignment items (${newItemsCount} new, ${updatedItemsCount} updated)`,
    );
    return items;
  },

  purge: (items) => {
    // Old assignments stay searchable; only items missing required metadata are dropped.
    return items.filter((i) => {
      return (
        i.metadata &&
        i.metadata.assessmentId &&
        i.metadata.programmeId !== undefined &&
        i.metadata.metaclassId !== undefined
      );
    });
  },
};
