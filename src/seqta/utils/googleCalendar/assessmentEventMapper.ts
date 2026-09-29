import { toISODate } from "@/seqta/utils/Loaders/engageParentTimetable";
import type { GoogleCalendarEventInput } from "./types";

export interface CalendarSyncAssessment {
  id: number;
  title: string;
  subject: string;
  code: string;
  due: string;
  status?: string;
}

const SKIP_STATUSES = new Set(["MARKS_RELEASED", "CANCELLED"]);

export function isAssessmentSeqtaKey(seqtaKey: string): boolean {
  return seqtaKey.includes(":assessment:");
}

export function seqtaAssessmentKey(origin: string, assessmentId: number): string {
  return `${origin}:assessment:${assessmentId}`;
}

function dueDateOnly(due: string): string | null {
  const trimmed = due.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return toISODate(parsed);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function hasTimeComponent(due: string): boolean {
  const trimmed = due.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  return /T\d{2}:\d{2}/.test(trimmed) || /\d{1,2}:\d{2}/.test(trimmed);
}

function timedDueBounds(due: string, timeZone: string): { start: string; end: string } | null {
  const parsed = new Date(due.trim());
  if (Number.isNaN(parsed.getTime())) return null;
  const datePart = toISODate(parsed);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours = parsed.getHours();
  const minutes = parsed.getMinutes();
  const start = `${datePart}T${pad(hours)}:${pad(minutes)}:00`;
  const endDate = new Date(parsed);
  endDate.setMinutes(endDate.getMinutes() + 30);
  const endDatePart = toISODate(endDate);
  const end = `${endDatePart}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;
  void timeZone;
  return { start, end };
}

export function shouldSyncAssessment(assessment: CalendarSyncAssessment): boolean {
  if (!assessment.id || !assessment.title.trim()) return false;
  if (assessment.status && SKIP_STATUSES.has(assessment.status)) return false;
  return dueDateOnly(assessment.due) != null;
}

export function assessmentToGoogleEvent(
  origin: string,
  assessment: CalendarSyncAssessment,
  timeZone: string,
): GoogleCalendarEventInput | null {
  if (!shouldSyncAssessment(assessment)) return null;

  const dateOnly = dueDateOnly(assessment.due)!;
  const subjectLabel = (assessment.subject || assessment.code || "Assessment").trim();
  const summary = `Due: ${assessment.title.trim()} (${subjectLabel})`;

  const descriptionLines = ["Synced by BetterSEQTA+", "Type: Assessment due date"];
  if (assessment.code) descriptionLines.push(`Code: ${assessment.code}`);

  const seqtaKey = seqtaAssessmentKey(origin, assessment.id);

  if (hasTimeComponent(assessment.due)) {
    const bounds = timedDueBounds(assessment.due, timeZone);
    if (!bounds) return null;
    return {
      seqtaKey,
      summary,
      description: descriptionLines.join("\n"),
      startDateTime: bounds.start,
      endDateTime: bounds.end,
      timeZone,
    };
  }

  return {
    seqtaKey,
    summary,
    description: descriptionLines.join("\n"),
    allDay: true,
    startDate: dateOnly,
    endDate: addDays(dateOnly, 1),
    startDateTime: `${dateOnly}T00:00:00`,
    endDateTime: `${dateOnly}T23:59:00`,
    timeZone,
  };
}

export function mapAssessmentsToGoogleEvents(
  origin: string,
  assessments: CalendarSyncAssessment[],
  timeZone: string,
): GoogleCalendarEventInput[] {
  const out: GoogleCalendarEventInput[] = [];
  const seen = new Set<string>();
  for (const assessment of assessments) {
    const mapped = assessmentToGoogleEvent(origin, assessment, timeZone);
    if (!mapped || seen.has(mapped.seqtaKey)) continue;
    seen.add(mapped.seqtaKey);
    out.push(mapped);
  }
  return out;
}
