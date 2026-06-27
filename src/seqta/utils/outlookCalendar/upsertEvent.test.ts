import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { upsertOutlookCalendarEvent, deleteOutlookCalendarEvent } from "./upsertEvent";

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

describe("upsertOutlookCalendarEvent", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("creates a new event when no existing id", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "evt-1" }),
    });

    const id = await upsertOutlookCalendarEvent("token", undefined, { subject: "Math" });
    expect(id).toBe("evt-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.microsoft.com/v1.0/me/events",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("patches when an existing id is provided", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const id = await upsertOutlookCalendarEvent("token", "evt-1", { subject: "Math" });
    expect(id).toBe("evt-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.microsoft.com/v1.0/me/events/evt-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

describe("deleteOutlookCalendarEvent", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("treats 404 as success", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    await expect(deleteOutlookCalendarEvent("token", "evt-1")).resolves.toBeUndefined();
  });
});
