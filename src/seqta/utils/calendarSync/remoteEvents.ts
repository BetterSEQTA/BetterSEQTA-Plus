import { GOOGLE_CALENDAR_API } from "@/config/googleCalendar";
import { OUTLOOK_GRAPH_API } from "@/config/outlookCalendar";

async function authorizedFetch(
  accessToken: string,
  url: string,
  init: RequestInit,
  refreshAccessToken?: () => Promise<string>,
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...init.headers },
  });
  if (res.status === 401 && refreshAccessToken) {
    return authorizedFetch(await refreshAccessToken(), url, init);
  }
  return res;
}

async function upsertRemoteEvent(
  accessToken: string,
  existingEventId: string | undefined,
  body: Record<string, unknown>,
  paths: { update: (id: string) => string; create: string },
  label: string,
  refreshAccessToken?: () => Promise<string>,
): Promise<string> {
  const headers = { "Content-Type": "application/json" };

  if (existingEventId) {
    const res = await authorizedFetch(
      accessToken,
      paths.update(existingEventId),
      { method: "PATCH", headers, body: JSON.stringify(body) },
      refreshAccessToken,
    );
    if (res.ok) return existingEventId;
    if (res.status !== 404) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(err?.error?.message ?? `${label} update failed (${res.status})`);
    }
  }

  const res = await authorizedFetch(
    accessToken,
    paths.create,
    { method: "POST", headers, body: JSON.stringify(body) },
    refreshAccessToken,
  );
  const json = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json?.error?.message ?? `${label} create failed (${res.status})`);
  }
  return json.id;
}

async function deleteRemoteEvent(
  accessToken: string,
  eventUrl: string,
  label: string,
  refreshAccessToken?: () => Promise<string>,
): Promise<void> {
  const res = await authorizedFetch(
    accessToken,
    eventUrl,
    { method: "DELETE" },
    refreshAccessToken,
  );
  if (res.ok || res.status === 404 || res.status === 410) return;
  const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  throw new Error(err?.error?.message ?? `${label} delete failed (${res.status})`);
}

export function upsertGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  existingEventId: string | undefined,
  body: Record<string, unknown>,
  refreshAccessToken?: () => Promise<string>,
): Promise<string> {
  const encodedCalendar = encodeURIComponent(calendarId);
  return upsertRemoteEvent(
    accessToken,
    existingEventId,
    body,
    {
      update: (id) =>
        `${GOOGLE_CALENDAR_API}/calendars/${encodedCalendar}/events/${encodeURIComponent(id)}`,
      create: `${GOOGLE_CALENDAR_API}/calendars/${encodedCalendar}/events`,
    },
    "Google Calendar",
    refreshAccessToken,
  );
}

export function deleteGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  refreshAccessToken?: () => Promise<string>,
): Promise<void> {
  return deleteRemoteEvent(
    accessToken,
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    "Google Calendar",
    refreshAccessToken,
  );
}

export function upsertOutlookCalendarEvent(
  accessToken: string,
  existingEventId: string | undefined,
  body: Record<string, unknown>,
  refreshAccessToken?: () => Promise<string>,
): Promise<string> {
  return upsertRemoteEvent(
    accessToken,
    existingEventId,
    body,
    {
      update: (id) => `${OUTLOOK_GRAPH_API}/me/events/${encodeURIComponent(id)}`,
      create: `${OUTLOOK_GRAPH_API}/me/events`,
    },
    "Outlook Calendar",
    refreshAccessToken,
  );
}

export function deleteOutlookCalendarEvent(
  accessToken: string,
  eventId: string,
  refreshAccessToken?: () => Promise<string>,
): Promise<void> {
  return deleteRemoteEvent(
    accessToken,
    `${OUTLOOK_GRAPH_API}/me/events/${encodeURIComponent(eventId)}`,
    "Outlook Calendar",
    refreshAccessToken,
  );
}
