import {
  BSPLUS_GOOGLE_CALENDAR_DESCRIPTION,
  BSPLUS_GOOGLE_CALENDAR_NAME,
  GOOGLE_CALENDAR_API,
} from "@/config/googleCalendar";

type GoogleCalendarResource = { id?: string; summary?: string };
type GoogleCalendarListResponse = { items?: GoogleCalendarResource[] };
type GoogleApiError = { error?: { message?: string } };

async function googleCalendarFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${GOOGLE_CALENDAR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & GoogleApiError;
  return { ok: res.ok, status: res.status, data };
}

async function calendarExists(accessToken: string, calendarId: string): Promise<boolean> {
  const { ok, status } = await googleCalendarFetch<GoogleCalendarResource>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}`,
  );
  return ok || status === 404 ? ok : false;
}

async function findExistingAppCalendar(accessToken: string): Promise<string | undefined> {
  const { ok, data } = await googleCalendarFetch<GoogleCalendarListResponse>(
    accessToken,
    "/users/me/calendarList",
  );
  if (!ok) return undefined;

  const match = (data.items ?? []).find((item) => item.summary === BSPLUS_GOOGLE_CALENDAR_NAME);
  return match?.id;
}

async function createAppCalendar(accessToken: string): Promise<string> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const { ok, status, data } = await googleCalendarFetch<GoogleCalendarResource>(
    accessToken,
    "/calendars",
    {
      method: "POST",
      body: JSON.stringify({
        summary: BSPLUS_GOOGLE_CALENDAR_NAME,
        description: BSPLUS_GOOGLE_CALENDAR_DESCRIPTION,
        timeZone,
      }),
    },
  );

  if (!ok || !data.id) {
    throw new Error(
      data.error?.message ?? `Could not create BetterSEQTA+ calendar (${status}).`,
    );
  }
  return data.id;
}

/** Resolves the app-owned calendar id, reusing stored or existing calendars when possible. */
export async function ensureGoogleAppCalendar(
  accessToken: string,
  storedCalendarId?: string,
): Promise<string> {
  if (storedCalendarId && (await calendarExists(accessToken, storedCalendarId))) {
    return storedCalendarId;
  }

  const existing = await findExistingAppCalendar(accessToken);
  if (existing) return existing;

  return createAppCalendar(accessToken);
}
