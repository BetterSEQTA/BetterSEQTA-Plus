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

import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { getMockAssessmentsData } from "@/seqta/ui/dev/hideSensitiveContent";

let cache: { time: number; data: any } | null = null;
const CACHE_MS = 10 * 60 * 1000;
const student = 69;

async function fetchJSON(url: string, body: any) {
  const res = await fetch(`${location.origin}${url}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function loadSubjects() {
  const res = await fetchJSON("/seqta/student/load/subjects?", {});
  return res.payload
    .filter((s: any) => s.active === 1)
    .flatMap((s: any) => s.subjects);
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

async function loadPast(student: number, subjects: Subject[]) {
  const map: Record<number, any> = {};
  await Promise.all(
    subjects.map(async (s) => {
      const res = await fetchJSON("/seqta/student/assessment/list/past?", {
        programme: s.programme,
        metaclass: s.metaclass,
        student,
      });
      if (res.payload.tasks) {
        res.payload.tasks.forEach((t: any) => {
          map[t.id] = t;
        });
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

export async function getAssessmentsData() {
  if (settingsState.mockNotices) {
    return getMockAssessmentsData();
  }

  if (cache && Date.now() - cache.time < CACHE_MS) return cache.data;
  const [subjects, colors, upcoming] = await Promise.all([
    loadSubjects(),
    loadPrefs(student),
    loadUpcoming(student),
  ]);
  const pastMap = await loadPast(student, subjects);
  const map: Record<number, any> = {};
  upcoming.forEach((a: any) => {
    map[a.id] = { ...a };
  });
  Object.values(pastMap).forEach((t: any) => {
    if (map[t.id]) Object.assign(map[t.id], t);
    else map[t.id] = t;
  });

  const allAssessments = Object.values(map);
  const submissions = await loadSubmissions(student, allAssessments);

  allAssessments.forEach((assessment: any) => {
    assessment.submitted = submissions[assessment.id] || false;
  });

  const data = { assessments: allAssessments, subjects, colors };
  cache = { time: Date.now(), data };
  return data;
}
