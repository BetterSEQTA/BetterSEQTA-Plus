import {
  activeSubjectsFromLearnPayload,
  assessmentBelongsToActiveSubjects,
  filterAssessmentsForActiveSubjects,
  type OverviewSubject,
} from "./utils";

interface PrefItem {
  name: string;
  value: string;
}

import { getUserInfo } from "@/seqta/ui/AddBetterSEQTAElements";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { getMockAssessmentsData } from "@/seqta/ui/dev/hideSensitiveContent";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import {
  getEngageAssessmentsData,
} from "./engageApi";

let cache: { time: number; engageAll?: boolean; studentId: number; data: any } | null =
  null;
const CACHE_MS = 10 * 60 * 1000;

async function fetchJSON(url: string, body: any) {
  const res = await fetch(`${location.origin}${url}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function loadSubjects(): Promise<OverviewSubject[]> {
  const res = await fetchJSON("/seqta/student/load/subjects?", {});
  return activeSubjectsFromLearnPayload(res.payload);
}

async function loadPrefs(student: number) {
  const res = await fetchJSON("/seqta/student/load/prefs?", {
    request: "userPrefs",
    asArray: true,
    user: student,
  });
  const colors: Record<string, string> = {};
  res.payload.forEach((p: PrefItem) => {
    if (p.name.startsWith("timetable.subject.colour.")) {
      const code = p.name.replace("timetable.subject.colour.", "");
      colors[code] = p.value;
    }
  });
  return colors;
}

async function loadUpcoming(student: number) {
  const res = await fetchJSON("/seqta/student/assessment/list/upcoming?", {
    student,
  });
  return res.payload;
}

function normalizeAssessmentDates(t: any, subject: OverviewSubject): any {
  const normalized = { ...t };
  if (!normalized.due && (t.date || t.dueDate || t.created || t.submittedDate)) {
    normalized.due = t.date || t.dueDate || t.created || t.submittedDate;
  }
  if (!normalized.programmeID) normalized.programmeID = subject.programme;
  if (!normalized.metaclassID) normalized.metaclassID = subject.metaclass;
  if (!normalized.code && t.subject) normalized.code = t.subject;
  return normalized;
}

async function loadPast(student: number, subjects: OverviewSubject[]) {
  const map: Record<number, any> = {};
  await Promise.all(
    subjects.map(async (s) => {
      const res = await fetchJSON("/seqta/student/assessment/list/past?", {
        programme: s.programme,
        metaclass: s.metaclass,
        student,
      });
      const processAssessment = (t: any) => {
        if (t && t.id) {
          const merged = {
            ...t,
            programmeID: t.programmeID || t.programme || s.programme,
            metaclassID: t.metaclassID || t.metaclass || s.metaclass,
            code: t.code || t.subject || s.code,
          };
          map[t.id] = normalizeAssessmentDates(merged, s);
        }
      };
      if (res.payload?.pending && Array.isArray(res.payload.pending)) {
        res.payload.pending.forEach(processAssessment);
      }
      if (res.payload?.tasks && Array.isArray(res.payload.tasks)) {
        res.payload.tasks.forEach(processAssessment);
      }
    }),
  );
  return map;
}

async function loadSubmissions(student: number, assessments: any[]) {
  const submissionMap: Record<number, boolean> = {};

  await Promise.all(
    assessments.map(async (assessment) => {
      try {
        const res = await fetchJSON(
          "/seqta/student/assessment/submissions/get",
          {
            assessment: assessment.id,
            metaclass: assessment.metaclassID,
            student,
          },
        );

        submissionMap[assessment.id] = res.payload && res.payload.length > 0;
      } catch (error) {
        console.warn(
          `Failed to fetch submission for assessment ${assessment.id}:`,
          error,
        );
        submissionMap[assessment.id] = false;
      }
    }),
  );

  return submissionMap;
}

async function getLearnAssessmentsData(studentId: number) {
  const [subjects, colors, upcoming] = await Promise.all([
    loadSubjects(),
    loadPrefs(studentId),
    loadUpcoming(studentId),
  ]);
  const pastMap = await loadPast(studentId, subjects);
  const map: Record<number, any> = {};
  upcoming.forEach((a: any) => {
    if (assessmentBelongsToActiveSubjects(a, subjects)) {
      map[a.id] = { ...a };
    }
  });
  Object.values(pastMap).forEach((t: any) => {
    if (!assessmentBelongsToActiveSubjects(t, subjects)) return;
    if (map[t.id]) Object.assign(map[t.id], t);
    else map[t.id] = t;
  });

  const allAssessments = filterAssessmentsForActiveSubjects(
    Object.values(map),
    subjects,
  );
  const submissions = await loadSubmissions(studentId, allAssessments);

  allAssessments.forEach((assessment: any) => {
    assessment.submitted = submissions[assessment.id] || false;
  });

  return { assessments: allAssessments, subjects, colors, studentId };
}

export async function getAssessmentsData() {
  if (settingsState.mockNotices) {
    return getMockAssessmentsData();
  }

  if (isSeqtaEngageExperience()) {
    if (cache && Date.now() - cache.time < CACHE_MS && cache.engageAll) {
      return cache.data;
    }

    const data = await getEngageAssessmentsData();
    cache = { time: Date.now(), studentId: 0, engageAll: true, data };
    return data;
  }

  const studentId = (await getUserInfo()).id;

  if (
    cache &&
    Date.now() - cache.time < CACHE_MS &&
    cache.studentId === studentId
  ) {
    return cache.data;
  }

  const data = await getLearnAssessmentsData(studentId);

  cache = { time: Date.now(), studentId, data };
  return data;
}
