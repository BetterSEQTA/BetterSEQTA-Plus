/** Shared "Today's Lessons" / relative day labels for Learn and Engage home timetables. */
export function formatTimetableDayLabel(date: Date): string {
  return `${date.toLocaleString("en-us", { weekday: "short" })} ${date.toLocaleDateString("en-au")}`;
}

export function lessonsSubtitleForViewDate(viewDate: Date): string {
  const today = new Date();
  const isSameMonth =
    today.getFullYear() === viewDate.getFullYear() &&
    today.getMonth() === viewDate.getMonth();

  if (isSameMonth) {
    const dayDiff = today.getDate() - viewDate.getDate();
    switch (dayDiff) {
      case 0:
        return "Today's Lessons";
      case 1:
        return "Yesterday's Lessons";
      case -1:
        return "Tomorrow's Lessons";
      default:
        return formatTimetableDayLabel(viewDate);
    }
  }

  return formatTimetableDayLabel(viewDate);
}
