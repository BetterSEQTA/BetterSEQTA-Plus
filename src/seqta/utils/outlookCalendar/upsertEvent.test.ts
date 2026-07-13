import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockFetch = jest.fn<typeof fetch>();
global.fetch = mockFetch as typeof fetch;

import {
  deleteOutlookCalendarEvent,
  listGoogleSyncedEvents,
  listOutlookSyncedEvents,
  upsertOutlookCalendarEvent,
} from "@/seqta/utils/calendarSync/remoteEvents";
import { BSPLUS_GOOGLE_CALENDAR_EVENT_PROP } from "@/config/googleCalendar";
import { BSPLUS_OUTLOOK_CALENDAR_EVENT_CATEGORY } from "@/config/outlookCalendar";

describe("outlook calendar remote events", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("creates a new event when none exists", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "evt-1" }), { status: 201 }),
    );

    const id = await upsertOutlookCalendarEvent("token", undefined, { subject: "Math" });
    expect(id).toBe("evt-1");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("deletes an event", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(deleteOutlookCalendarEvent("token", "evt-1")).resolves.toBeUndefined();
  });

  it("lists Outlook synced events and paginates", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            value: [
              {
                id: "o1",
                subject: "Math",
                body: { content: "Synced by BetterSEQTA+\nKey: https://school.seqta.com.au:cal:1" },
                start: { dateTime: "2026-07-13T09:00:00", timeZone: "UTC" },
                end: { dateTime: "2026-07-13T10:00:00", timeZone: "UTC" },
                categories: [BSPLUS_OUTLOOK_CALENDAR_EVENT_CATEGORY],
              },
            ],
            "@odata.nextLink": "https://graph.microsoft.com/v1.0/me/calendarView?$skiptoken=2",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            value: [
              {
                id: "o2",
                subject: "English",
                body: { content: "Synced by BetterSEQTA+\nKey: https://school.seqta.com.au:cal:2" },
                start: { dateTime: "2026-07-14T09:00:00", timeZone: "UTC" },
                end: { dateTime: "2026-07-14T10:00:00", timeZone: "UTC" },
                categories: [BSPLUS_OUTLOOK_CALENDAR_EVENT_CATEGORY],
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const events = await listOutlookSyncedEvents("token", {
      from: "2026-07-13",
      until: "2026-07-20",
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      id: "o1",
      seqtaKey: "https://school.seqta.com.au:cal:1",
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("google calendar remote list", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("lists Google synced events using private extended properties", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "g1",
              summary: "Math",
              description: "Synced by BetterSEQTA+",
              start: { dateTime: "2026-07-13T09:00:00", timeZone: "UTC" },
              end: { dateTime: "2026-07-13T10:00:00", timeZone: "UTC" },
              extendedProperties: {
                private: { [BSPLUS_GOOGLE_CALENDAR_EVENT_PROP]: "https://school.seqta.com.au:cal:1" },
              },
            },
            {
              id: "g-skip",
              summary: "Unrelated",
              start: { dateTime: "2026-07-13T11:00:00", timeZone: "UTC" },
              end: { dateTime: "2026-07-13T12:00:00", timeZone: "UTC" },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const events = await listGoogleSyncedEvents("token", "cal-id", {
      from: "2026-07-13",
      until: "2026-07-20",
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "g1",
      seqtaKey: "https://school.seqta.com.au:cal:1",
      date: "2026-07-13",
    });
  });
});
