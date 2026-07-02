import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@/config/googleCalendar", () => ({
  BSPLUS_GOOGLE_CALENDAR_DESCRIPTION: "desc",
  BSPLUS_GOOGLE_CALENDAR_NAME: "BetterSEQTA+ Timetable",
  GOOGLE_CALENDAR_API: "https://www.googleapis.com/calendar/v3",
}));

import { ensureGoogleAppCalendar } from "./calendarProvisioning";

const fetchMock = jest.fn<typeof fetch>();
global.fetch = fetchMock as typeof fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("ensureGoogleAppCalendar", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("reuses a stored calendar id when it still exists", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "stored-id", summary: "BetterSEQTA+ Timetable" }));

    await expect(ensureGoogleAppCalendar("token", "stored-id")).resolves.toBe("stored-id");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("finds an existing app calendar by name when stored id is missing", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [{ id: "found-id", summary: "BetterSEQTA+ Timetable" }],
      }),
    );

    await expect(ensureGoogleAppCalendar("token")).resolves.toBe("found-id");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token" }) }),
    );
  });

  it("creates a calendar when none exists", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: "new-id" }));

    await expect(ensureGoogleAppCalendar("token")).resolves.toBe("new-id");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.googleapis.com/calendar/v3/calendars",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
