export function formatDate(dateStr: string, submitted?: boolean): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffTime = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0 && !submitted) {
    const overdueDays = Math.abs(diffDays);
    if (overdueDays === 1) return "1 day overdue";
    return `${overdueDays} days overdue`;
  }

  if (diffDays === 0) return "Today";

  if (diffDays === 1) return "Tomorrow";

  if (diffDays <= 7) {
    const weekdayName = d.toLocaleDateString(undefined, { weekday: "long" });

    return diffDays < 0 ? `Last ${weekdayName}` : weekdayName;
  }

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function determineStatus(item: any): string {
  if (
    item.status === "MARKS_RELEASED" ||
    item.grade ||
    (item.percentage !== undefined && item.percentage !== null) ||
    (item.achieved !== undefined && item.achieved !== null)
  ) {
    return "MARKS_RELEASED";
  }

  const completedKey = "betterseqta-completed-assessments";
  const completed = JSON.parse(localStorage.getItem(completedKey) || "[]");
  if (completed.includes(item.id)) {
    return "MARKS_RELEASED";
  }

  if (item.submitted) {
    return "SUBMITTED";
  }

  const now = new Date();
  const due = new Date(item.due);

  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "OVERDUE";
  }

  if (diffDays <= 7) {
    return "DUE_SOON";
  }

  return "UPCOMING";
}

export function getGradeValue(assessment: any): number | null {
  if (
    assessment.results?.percentage !== undefined &&
    assessment.results.percentage !== null
  ) {
    return assessment.results.percentage;
  }

  if (assessment.percentage !== undefined && assessment.percentage !== null) {
    return assessment.percentage;
  }

  if (
    assessment.achieved !== undefined &&
    assessment.outOf !== undefined &&
    assessment.achieved !== null &&
    assessment.outOf !== null &&
    assessment.outOf > 0
  ) {
    return (assessment.achieved / assessment.outOf) * 100;
  }

  if (
    assessment.results?.achieved !== undefined &&
    assessment.results?.outOf !== undefined &&
    assessment.results.achieved !== null &&
    assessment.results.outOf !== null &&
    assessment.results.outOf > 0
  ) {
    return (assessment.results.achieved / assessment.results.outOf) * 100;
  }

  return null;
}
