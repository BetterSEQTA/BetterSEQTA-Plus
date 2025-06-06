export function formatDate(dateStr: string, submitted?: boolean): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffTime = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // If it's overdue but don't show overdue text for submitted assessments
  if (diffDays < 0 && !submitted) {
    const overdueDays = Math.abs(diffDays);
    if (overdueDays === 1) return '1 day overdue';
    return `${overdueDays} days overdue`;
  }
  
  // If it's today
  if (diffDays === 0) return 'Today';
  
  // If it's tomorrow
  if (diffDays === 1) return 'Tomorrow';
  
  // If it's within a week
  if (diffDays <= 7) {
    return d.toLocaleDateString(undefined, { weekday: 'long' });
  }
  
  // Otherwise show full date
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

export function determineStatus(item: any): string {
  // Check if marks are released or if there's a grade
  if (item.status === 'MARKS_RELEASED' || item.grade ||
      (item.percentage !== undefined && item.percentage !== null) ||
      (item.achieved !== undefined && item.achieved !== null)) {
    return 'MARKS_RELEASED';
  }
  
  const now = new Date();
  const due = new Date(item.due);
  
  // Calculate the difference in days (more precise calculation)
  const diffTime = due.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  // Check if overdue (more than 1 day past due)
  if (diffDays < -1) {
    // If it's submitted but still overdue, treat as DUE_SOON since it's awaiting marking
    if (item.submitted) {
      return 'DUE_SOON';
    }
    return 'OVERDUE';
  }
  
  // Check if due soon (today through 7 days from now)
  if (diffDays <= 7) {
    return 'DUE_SOON';
  }
  
  return 'UPCOMING';
}

export function getGradeValue(assessment: any): number | null {
  // Check results.percentage first (most common for graded assessments)
  if (assessment.results?.percentage !== undefined && assessment.results.percentage !== null) {
    return assessment.results.percentage;
  }
  
  // Check direct percentage property
  if (assessment.percentage !== undefined && assessment.percentage !== null) {
    return assessment.percentage;
  }
  
  // Check achieved/outOf combination
  if (assessment.achieved !== undefined && assessment.outOf !== undefined &&
      assessment.achieved !== null && assessment.outOf !== null && assessment.outOf > 0) {
    return (assessment.achieved / assessment.outOf) * 100;
  }
  
  // Check results achieved/outOf combination
  if (assessment.results?.achieved !== undefined && assessment.results?.outOf !== undefined &&
      assessment.results.achieved !== null && assessment.results.outOf !== null && assessment.results.outOf > 0) {
    return (assessment.results.achieved / assessment.results.outOf) * 100;
  }
  
  return null;
}