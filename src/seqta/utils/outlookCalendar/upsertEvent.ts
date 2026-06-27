import { OUTLOOK_GRAPH_API } from "@/config/outlookCalendar";

export async function upsertOutlookCalendarEvent(
  accessToken: string,
  existingEventId: string | undefined,
  body: Record<string, unknown>,
  refreshAccessToken?: () => Promise<string>,
): Promise<string> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  if (existingEventId) {
    const res = await fetch(`${OUTLOOK_GRAPH_API}/me/events/${encodeURIComponent(existingEventId)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    if (res.status === 401 && refreshAccessToken) {
      const nextToken = await refreshAccessToken();
      return upsertOutlookCalendarEvent(nextToken, existingEventId, body);
    }
    if (res.ok) return existingEventId;
    if (res.status !== 404) {
      const err = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new Error(err?.error?.message ?? `Outlook Calendar update failed (${res.status})`);
    }
  }

  const res = await fetch(`${OUTLOOK_GRAPH_API}/me/events`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (res.status === 401 && refreshAccessToken) {
    const nextToken = await refreshAccessToken();
    return upsertOutlookCalendarEvent(nextToken, undefined, body);
  }
  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.id) {
    throw new Error(json?.error?.message ?? `Outlook Calendar create failed (${res.status})`);
  }
  return json.id;
}

export async function deleteOutlookCalendarEvent(
  accessToken: string,
  eventId: string,
  refreshAccessToken?: () => Promise<string>,
): Promise<void> {
  const res = await fetch(`${OUTLOOK_GRAPH_API}/me/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401 && refreshAccessToken) {
    const nextToken = await refreshAccessToken();
    return deleteOutlookCalendarEvent(nextToken, eventId);
  }
  if (res.ok || res.status === 404 || res.status === 410) return;
  const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  throw new Error(err?.error?.message ?? `Outlook Calendar delete failed (${res.status})`);
}
