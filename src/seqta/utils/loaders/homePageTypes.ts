import type { OverviewSubject } from "@/plugins/built-in/assessmentsOverview/utils";

/** SEQTA user pref row from load/prefs (subject/tutor colours). */
export type SeqtaColourPref = {
  name: string;
  value: string;
};

export type HomeLessonAssessmentLink = {
  id: number | string;
  title: string;
};

export type HomeTimetableLesson = {
  type: string;
  code: string;
  from: string;
  until: string;
  tutorID?: number | string;
  description?: string;
  staff?: string;
  room?: string;
  programmeID?: number;
  metaID?: number;
  assessments?: HomeLessonAssessmentLink[];
  attendance?: { label?: string } | null;
  colour?: string;
  invert?: boolean;
  attendanceTitle?: string;
};

export type HomeUpcomingAssessment = {
  id: number | string;
  due: string;
  code: string;
  title: string;
  subject: string;
  programmeID: number;
  metaclassID: number;
  filterCode?: string;
  colour?: string;
};

export type UpcomingDateBucket = {
  div: HTMLElement;
  assessments: HomeUpcomingAssessment[];
};

export type DateSortable = { due?: string; date?: string };

export type ActiveSubjectLike = OverviewSubject;
