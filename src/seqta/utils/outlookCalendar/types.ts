export interface OutlookCalendarStatus {
  configured: boolean;
  connected: boolean;
  lastSyncAt?: number;
  lastSyncOrigin?: string;
}
