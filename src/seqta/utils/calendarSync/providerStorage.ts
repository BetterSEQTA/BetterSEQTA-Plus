import type { EventMapRecord } from "@/seqta/utils/calendarSync/eventMap";
import { createCalendarStateStorage } from "@/seqta/utils/calendarSync/eventMap";

export const BSPLUS_GOOGLE_CALENDAR_STORAGE_KEY = "bsplus_google_calendar";
export const BSPLUS_OUTLOOK_CALENDAR_STORAGE_KEY = "bsplus_outlook_calendar";

export interface GoogleCalendarStoredState {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  connectedAt?: number;
  lastSyncAt?: number;
  lastWeeklySyncAt?: number;
  lastSyncOrigin?: string;
  syncWeeksAhead?: number;
  autoSyncWeekly?: boolean;
  pendingWeeklySync?: boolean;
  eventMap?: EventMapRecord;
}

export interface OutlookCalendarStatus {
  configured: boolean;
  connected: boolean;
  lastSyncAt?: number;
  lastSyncOrigin?: string;
}

export interface OutlookCalendarStoredState {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  connectedAt?: number;
  lastSyncAt?: number;
  lastSyncOrigin?: string;
  eventMap?: EventMapRecord;
}

const googleStorage = createCalendarStateStorage<GoogleCalendarStoredState>(
  BSPLUS_GOOGLE_CALENDAR_STORAGE_KEY,
);
const outlookStorage = createCalendarStateStorage<OutlookCalendarStoredState>(
  BSPLUS_OUTLOOK_CALENDAR_STORAGE_KEY,
);

export const readGoogleCalendarState = googleStorage.read;
export const writeGoogleCalendarState = googleStorage.write;
export const clearGoogleCalendarState = googleStorage.clear;

export const readOutlookCalendarState = outlookStorage.read;
export const writeOutlookCalendarState = outlookStorage.write;
export const clearOutlookCalendarState = outlookStorage.clear;
