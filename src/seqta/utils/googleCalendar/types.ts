export interface SeqtaTimetableLesson {
  date: string;
  from: string;
  until: string;
  description: string;
  staff?: string;
  room?: string;
  code?: string;
  type?: string;
  period?: string;
  calendarid?: string | number;
  ci?: number;
  /** SEQTA subject colour (hex/rgb) used for Google Calendar event colour. */
  colour?: string;
}

export interface GoogleCalendarEventInput {
  seqtaKey: string;
  summary: string;
  location?: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  /** Google Calendar event colorId ("1"–"11"). */
  colorId?: string;
}

export interface GoogleCalendarSyncRequest {
  origin: string;
  lessons: SeqtaTimetableLesson[];
  mode?: "full" | "incremental";
  weeksAhead?: number;
}

export type GoogleCalendarSyncPhase = "preparing" | "deleting" | "upserting" | "done";

export interface GoogleCalendarSyncProgress {
  phase: GoogleCalendarSyncPhase;
  current: number;
  total: number;
  message: string;
}

export interface GoogleCalendarSyncOptions {
  onProgress?: (progress: GoogleCalendarSyncProgress) => void;
}

export interface GoogleCalendarSyncResult {
  success: boolean;
  connected?: boolean;
  configured?: boolean;
  created?: number;
  updated?: number;
  deleted?: number;
  skipped?: number;
  failed?: number;
  lastSyncAt?: number;
  error?: string;
}

export interface GoogleCalendarStatus {
  configured: boolean;
  connected: boolean;
  lastSyncAt?: number;
  lastWeeklySyncAt?: number;
  lastSyncOrigin?: string;
  syncWeeksAhead?: number;
  autoSyncWeekly?: boolean;
}

export interface GoogleCalendarDeleteResult {
  success: boolean;
  configured?: boolean;
  connected?: boolean;
  deleted?: number;
  failed?: number;
  error?: string;
}
