export type AssessmentStatus = "OVERDUE" | "MARKS_RELEASED" | "PENDING";

export interface Assessment {
  id: number;
  title: string;
  subject: string;
  status: AssessmentStatus;
  due: string;
  code: string;
  metaclassID: number;
  programmeID: number;
  graded: boolean;
  overdue: boolean;
  hasFeedback: boolean;
  expectationsEnabled: boolean;
  expectationsCompleted: boolean;
  reflectionsEnabled: boolean;
  reflectionsCompleted: boolean;
  availability: string;
  finalGrade?: number;
  letterGrade?: string;
}

export type AnalyticsData = Assessment[];

export interface AnalyticsCache {
  updatedAt: number;
  assessments: Assessment[];
}

export interface AnalyticsClassOption {
  key: string;
  title: string;
  yearLabel: string;
  programme: number;
  metaclass: number;
}

export interface AnalyticsClassGroup {
  id: string;
  name: string;
  classKeys: string[];
}
