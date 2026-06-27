import { GOOGLE_CALENDAR_API } from "@/config/googleCalendar";

export async function upsertGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  existingEventId: string | undefined,
  body: Record<string, unknown>,
  refreshAccessToken?: () => Promise<string>,
): Promise<string> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  if (existingEventId) {
    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingEventId)}`,
      { method: "PATCH", headers, body: JSON.stringify(body) },
    );
    if (res.status === 401 && refreshAccessToken) {
      const nextToken = await refreshAccessToken();
      return upsertGoogleCalendarEvent(nextToken, calendarId, existingEventId, body);
    }
    if (res.ok) return existingEventId;
    if (res.status !== 404) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(err?.error?.message ?? `Google Calendar update failed (${res.status})`);
    }
  }

  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", headers, body: JSON.stringify(body) },
  );
  if (res.status === 401 && refreshAccessToken) {
    const nextToken = await refreshAccessToken();
    return upsertGoogleCalendarEvent(nextToken, calendarId, undefined, body);
  }
  const json = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json?.error?.message ?? `Google Calendar create failed (${res.status})`);
  }
  return json.id;
}
