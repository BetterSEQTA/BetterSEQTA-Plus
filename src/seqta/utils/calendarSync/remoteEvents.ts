import { BSPLUS_GOOGLE_CALENDAR_EVENT_PROP, GOOGLE_CALENDAR_API } from "@/config/googleCalendar";
import {
  BSPLUS_OUTLOOK_CALENDAR_EVENT_CATEGORY,
  OUTLOOK_GRAPH_API,
} from "@/config/outlookCalendar";
import {
  eventFingerprint,
  parseOutlookSeqtaKey,
} from "@/seqta/utils/calendarSync/eventFingerprint";
import type { SyncDateRange } from "@/seqta/utils/googleCalendar/syncDateRange";

export type RemoteSyncedEvent = {
  seqtaKey: string;
  id: string;
  fingerprint: string;
  date: string;
};

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

function toRfc3339Start(date: string): string {
  return `${date}T00:00:00Z`;
}

function toRfc3339EndExclusive(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}T00:00:00Z`;
}

function dateFromDateTime(value: string | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

type GoogleListItem = {
  id?: string;
  summary?: string;
  location?: string;
  description?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
};

function googleItemToRemote(item: GoogleListItem): RemoteSyncedEvent | null {
  const seqtaKey = item.extendedProperties?.private?.[BSPLUS_GOOGLE_CALENDAR_EVENT_PROP];
  if (!item.id || !seqtaKey) return null;
  const startDateTime = item.start?.dateTime ?? (item.start?.date ? `${item.start.date}T00:00:00` : "");
  const endDateTime = item.end?.dateTime ?? (item.end?.date ? `${item.end.date}T00:00:00` : "");
  const timeZone = item.start?.timeZone ?? item.end?.timeZone ?? "UTC";
  return {
    seqtaKey,
    id: item.id,
    date: dateFromDateTime(startDateTime) || item.start?.date || "",
    fingerprint: eventFingerprint({
      summary: item.summary ?? "",
      location: item.location,
      description: item.description,
      startDateTime,
      endDateTime,
      timeZone,
    }),
  };
}

export async function listGoogleSyncedEvents(
  accessToken: string,
  calendarId: string,
  range: SyncDateRange,
  refreshAccessToken?: () => Promise<string>,
): Promise<RemoteSyncedEvent[]> {
  const encodedCalendar = encodeURIComponent(calendarId);
  const out: RemoteSyncedEvent[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
      timeMin: toRfc3339Start(range.from),
      timeMax: toRfc3339EndExclusive(range.until),
      fields:
        "nextPageToken,items(id,summary,location,description,start,end,extendedProperties)",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await authorizedFetch(
      accessToken,
      `${GOOGLE_CALENDAR_API}/calendars/${encodedCalendar}/events?${params}`,
      { method: "GET" },
      refreshAccessToken,
    );
    const json = (await res.json().catch(() => ({}))) as {
      items?: GoogleListItem[];
      nextPageToken?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(json?.error?.message ?? `Google Calendar list failed (${res.status})`);
    }

    for (const item of json.items ?? []) {
      const mapped = googleItemToRemote(item);
      if (mapped) out.push(mapped);
    }
    pageToken = json.nextPageToken;
  } while (pageToken);

  return out;
}

type OutlookListItem = {
  id?: string;
  subject?: string;
  body?: { content?: string; contentType?: string };
  location?: { displayName?: string };
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  categories?: string[];
};

function outlookItemToRemote(item: OutlookListItem): RemoteSyncedEvent | null {
  if (!item.id) return null;
  const categories = item.categories ?? [];
  if (!categories.includes(BSPLUS_OUTLOOK_CALENDAR_EVENT_CATEGORY)) return null;
  const bodyContent = item.body?.content ?? "";
  const seqtaKey = parseOutlookSeqtaKey(bodyContent);
  if (!seqtaKey) return null;

  const startDateTime = (item.start?.dateTime ?? "").replace(/\.\d+$/, "");
  const endDateTime = (item.end?.dateTime ?? "").replace(/\.\d+$/, "");
  const timeZone = item.start?.timeZone ?? item.end?.timeZone ?? "UTC";

  return {
    seqtaKey,
    id: item.id,
    date: dateFromDateTime(startDateTime),
    fingerprint: eventFingerprint({
      summary: item.subject ?? "",
      location: item.location?.displayName,
      description: outlookDescriptionForFingerprint(bodyContent),
      startDateTime,
      endDateTime,
      timeZone,
    }),
  };
}

/** Strip Outlook Key line so fingerprint matches local mapped event description. */
function outlookDescriptionForFingerprint(bodyContent: string): string {
  return bodyContent
    .split("\n")
    .filter((line) => !/^Key:\s*/.test(line))
    .join("\n")
    .trim();
}

export async function listOutlookSyncedEvents(
  accessToken: string,
  range: SyncDateRange,
  refreshAccessToken?: () => Promise<string>,
): Promise<RemoteSyncedEvent[]> {
  const out: RemoteSyncedEvent[] = [];
  const params = new URLSearchParams({
    startDateTime: toRfc3339Start(range.from),
    endDateTime: toRfc3339EndExclusive(range.until),
    $top: "100",
    $select: "id,subject,body,location,start,end,categories",
  });

  let nextUrl: string | undefined =
    `${OUTLOOK_GRAPH_API}/me/calendarView?${params.toString()}`;

  while (nextUrl) {
    const res = await authorizedFetch(
      accessToken,
      nextUrl,
      {
        method: "GET",
        headers: { Prefer: 'outlook.body-content-type="text"' },
      },
      refreshAccessToken,
    );
    const json = (await res.json().catch(() => ({}))) as {
      value?: OutlookListItem[];
      "@odata.nextLink"?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(json?.error?.message ?? `Outlook Calendar list failed (${res.status})`);
    }

    for (const item of json.value ?? []) {
      const mapped = outlookItemToRemote(item);
      if (mapped) out.push(mapped);
    }
    nextUrl = json["@odata.nextLink"];
  }

  return out;
}
