import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockFetch = jest.fn<typeof fetch>();
global.fetch = mockFetch as typeof fetch;

import {
  deleteOutlookCalendarEvent,
  upsertOutlookCalendarEvent,
} from "@/seqta/utils/calendarSync/remoteEvents";

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
});
