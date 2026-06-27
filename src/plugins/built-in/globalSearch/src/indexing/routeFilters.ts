/** Routes already indexed by the assignments job — passive capture would duplicate them. */
export function isAssessmentListRoute(route: string): boolean {
  const normalized = route.toLowerCase();
  return (
    normalized.includes("/assessment/list/past") ||
    normalized.includes("/assessment/list/upcoming")
  );
}
