import BookOpenIcon from "@lucide/svelte/icons/book-open";
import CalendarIcon from "@lucide/svelte/icons/calendar";
import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";
import ChartColumnIcon from "@lucide/svelte/icons/chart-column";
import CircleCheckIcon from "@lucide/svelte/icons/circle-check";
import ClockIcon from "@lucide/svelte/icons/clock";
import FileCheckIcon from "@lucide/svelte/icons/file-check";
import ListIcon from "@lucide/svelte/icons/list";
import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";

export type OverviewIcon = typeof ListIcon;

export const DEFAULT_COLUMN_ICON: OverviewIcon = ListIcon;

export const STATUS_COLUMN_ICONS: Record<string, OverviewIcon> = {
  UPCOMING: CalendarDaysIcon,
  DUE_SOON: ClockIcon,
  OVERDUE: TriangleAlertIcon,
  SUBMITTED: FileCheckIcon,
  MARKS_RELEASED: CircleCheckIcon,
};

export const GROUP_SORT_ICONS: Record<string, OverviewIcon> = {
  year: CalendarIcon,
  subject: BookOpenIcon,
  grade: ChartColumnIcon,
  title: ListIcon,
};
