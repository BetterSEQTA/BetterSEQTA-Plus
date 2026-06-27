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
}

export interface GoogleCalendarEventInput {
  seqtaKey: string;
  summary: string;
  location?: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
}

export interface GoogleCalendarSyncRequest {
  origin: string;
  lessons: SeqtaTimetableLesson[];
}

export interface GoogleCalendarSyncResult {
  success: boolean;
  connected?: boolean;
  configured?: boolean;
  created?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  lastSyncAt?: number;
  error?: string;
}

export interface GoogleCalendarStatus {
  configured: boolean;
  connected: boolean;
  lastSyncAt?: number;
  lastSyncOrigin?: string;
}
