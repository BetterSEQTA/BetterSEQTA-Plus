export const ENGAGE_STUDENT_STORAGE_KEY = () =>
  `bsplus.engageTimetable.student.${location.origin}`;

/** Engage assessments URLs: /#?page=/assessments/{studentId}/{programme}:{metaclass}:{studentId} */
export function getEngageAssessmentStudentId(): string | null {
  const hashMatch = window.location.hash.match(/\/assessments\/(\d+)/);
  if (hashMatch?.[1]) return hashMatch[1];

  return localStorage.getItem(ENGAGE_STUDENT_STORAGE_KEY());
}

export function buildEngageAssessmentPagePath(
  studentId: string | number,
  programmeId: string | number,
  metaclassId: string | number,
  assessmentId?: string | number,
): string {
  const base = `#?page=/assessments/${studentId}/${programmeId}:${metaclassId}:${studentId}`;
  return assessmentId != null ? `${base}&item=${assessmentId}` : base;
}

export function buildEngageAssessmentOverviewPath(
  studentId: string | number,
): string {
  return `#?page=/assessments/${studentId}/overview`;
}

export function isEngageAssessmentOverviewRoute(hash = window.location.hash): boolean {
  return /\/assessments\/\d+\/overview/.test(hash);
}
