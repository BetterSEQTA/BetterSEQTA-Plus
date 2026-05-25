import { getEngageAssessmentStudentId } from "@/seqta/utils/engageAssessmentStudent";

interface Subject {
  code: string;
  programme: number;
  metaclass: number;
  title: string;
}

interface PrefItem {
  name: string;
  value: string;
}

export interface EngageStudent {
  id: number;
  name: string;
}

interface EngageChildPayload {
  id?: number;
  name?: string;
  terms?: {
    active?: number;
    subjects?: {
      code?: string;
      programme?: number;
      metaclass?: number;
      title?: string;
      description?: string;
    }[];
  }[];
}

async function fetchJSON(url: string, body: unknown) {
  const res = await fetch(`${location.origin}${url}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function loadEngageChildrenPayload(): Promise<EngageChildPayload[]> {
  const res = await fetchJSON("/seqta/parent/load/subjects", {});
  return Array.isArray(res.payload) ? res.payload : [];
}

export async function resolveEngageStudentId(): Promise<number> {
  const fromUrlOrStorage = getEngageAssessmentStudentId();
  if (fromUrlOrStorage) return Number(fromUrlOrStorage);

  const children = await loadEngageChildrenPayload();
  const firstChild = children[0];
  if (firstChild?.id != null) return Number(firstChild.id);

  throw new Error("Could not resolve Engage student ID");
}

function subjectsFromChild(child: EngageChildPayload): Subject[] {
  return (child.terms ?? [])
    .filter((term) => term.active === 1)
    .flatMap((term) =>
      (term.subjects ?? []).map((subject) => ({
        code: subject.code ?? "",
        programme: subject.programme ?? 0,
        metaclass: subject.metaclass ?? 0,
        title: subject.title ?? subject.description ?? subject.code ?? "",
      })),
    );
}

async function loadEngagePrefs(): Promise<Record<string, string>> {
  const res = await fetchJSON("/seqta/parent/load/prefs?", {
    request: "userPrefs",
    asArray: true,
  });

  const colors: Record<string, string> = {};
  (res.payload ?? []).forEach((pref: PrefItem) => {
    if (pref.name.startsWith("timetable.subject.colour.")) {
      const code = pref.name.replace("timetable.subject.colour.", "");
      colors[code] = pref.value;
    }
  });
  return colors;
}

async function loadEngageUpcoming(studentId: number) {
  const res = await fetchJSON("/seqta/parent/assessment/list/upcoming?", {
    student: studentId,
  });
  return res.payload ?? [];
}

function normalizeAssessmentDates(t: any, subject: Subject): any {
  const normalized = { ...t };
  if (!normalized.due && (t.date || t.dueDate || t.created || t.submittedDate)) {
    normalized.due = t.date || t.dueDate || t.created || t.submittedDate;
  }
  if (!normalized.programmeID) normalized.programmeID = subject.programme;
  if (!normalized.metaclassID) normalized.metaclassID = subject.metaclass;
  if (!normalized.code && t.subject) normalized.code = t.subject;
  return normalized;
}

async function loadEngagePast(studentId: number, subjects: Subject[]) {
  const map: Record<number, any> = {};

  await Promise.all(
    subjects.map(async (subject) => {
      const res = await fetchJSON("/seqta/parent/assessment/list/past?", {
        programme: subject.programme,
        metaclass: subject.metaclass,
        student: studentId,
      });

      const processAssessment = (task: any) => {
        if (task?.id) {
          const merged = {
            ...task,
            programmeID: task.programmeID || task.programme || subject.programme,
            metaclassID: task.metaclassID || task.metaclass || subject.metaclass,
            code: task.code || task.subject || subject.code,
          };
          map[task.id] = normalizeAssessmentDates(merged, subject);
        }
      };

      if (Array.isArray(res.payload?.pending)) {
        res.payload.pending.forEach(processAssessment);
      }
      if (Array.isArray(res.payload?.tasks)) {
        res.payload.tasks.forEach(processAssessment);
      }
    }),
  );

  return map;
}

async function loadEngageSubmissions(studentId: number, assessments: any[]) {
  const submissionMap: Record<number, boolean> = {};

  await Promise.all(
    assessments.map(async (assessment) => {
      try {
        const res = await fetchJSON("/seqta/parent/assessment/submissions/get", {
          assessment: assessment.id,
          metaclass: assessment.metaclassID,
          student: studentId,
        });
        submissionMap[assessment.id] =
          Array.isArray(res.payload) && res.payload.length > 0;
      } catch (error) {
        console.warn(
          `[BetterSEQTA+] Failed to fetch Engage submission for assessment ${assessment.id}:`,
          error,
        );
        submissionMap[assessment.id] = false;
      }
    }),
  );

  return submissionMap;
}

async function loadEngageAssessmentsForStudent(
  child: EngageChildPayload,
): Promise<any[]> {
  const studentId = Number(child.id);
  const studentName = child.name ?? "Student";
  const subjects = subjectsFromChild(child);
  const [upcoming, pastMap] = await Promise.all([
    loadEngageUpcoming(studentId),
    loadEngagePast(studentId, subjects),
  ]);

  const map: Record<number, any> = {};
  upcoming.forEach((assessment: any) => {
    map[assessment.id] = { ...assessment };
  });
  Object.values(pastMap).forEach((task: any) => {
    if (map[task.id]) Object.assign(map[task.id], task);
    else map[task.id] = task;
  });

  const assessments = Object.values(map).map((assessment) => ({
    ...assessment,
    studentId,
    studentName,
  }));

  const submissions = await loadEngageSubmissions(studentId, assessments);
  assessments.forEach((assessment) => {
    assessment.submitted = submissions[assessment.id] || false;
  });

  return assessments;
}

export async function getEngageAssessmentsData() {
  const childrenPayload = await loadEngageChildrenPayload();
  const students: EngageStudent[] = childrenPayload
    .filter((child) => child.id != null)
    .map((child) => ({
      id: Number(child.id),
      name: child.name ?? "Student",
    }));

  if (!students.length) {
    throw new Error("No Engage students found");
  }

  const [colors, assessmentsByChild] = await Promise.all([
    loadEngagePrefs(),
    Promise.all(childrenPayload.map((child) => loadEngageAssessmentsForStudent(child))),
  ]);

  const subjectsMap = new Map<string, Subject>();
  childrenPayload.forEach((child) => {
    subjectsFromChild(child).forEach((subject) => {
      if (!subjectsMap.has(subject.code)) {
        subjectsMap.set(subject.code, subject);
      }
    });
  });

  const defaultStudentId = await resolveEngageStudentId();

  return {
    assessments: assessmentsByChild.flat(),
    subjects: Array.from(subjectsMap.values()),
    colors,
    students,
    studentId: defaultStudentId,
  };
}
