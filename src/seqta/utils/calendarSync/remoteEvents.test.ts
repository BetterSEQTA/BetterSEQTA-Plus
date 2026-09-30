import { afterEach, expect, it, jest } from "@jest/globals";
import {
  listGoogleSyncedEvents,
  listOutlookSyncedEvents,
} from "./remoteEvents";

afterEach(() => jest.restoreAllMocks());

it.each([
  { provider: "google", body: "invalid JSON" },
  { provider: "outlook", body: "invalid JSON" },
  {
    provider: "google",
    body: JSON.stringify({ error: { message: "Invalid response" } }),
  },
  { provider: "outlook", body: "{}" },
])(
  "rejects malformed successful $provider listings ($body)",
  async ({ provider, body }) => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body));
    const range = { from: "2026-10-04", until: "2026-10-04" };
    const listing =
      provider === "google"
        ? listGoogleSyncedEvents("token", "calendar", range)
        : listOutlookSyncedEvents("token", range);
    await expect(listing).rejects.toThrow();
  },
);

it.each(["google", "outlook"])(
  "queries %s over complete local days across Sydney DST",
  async (provider) => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const expected =
      zone === "Australia/Sydney"
        ? ["2026-10-03T14:00:00.000Z", "2026-10-04T13:00:00.000Z"]
        : zone === "UTC"
          ? ["2026-10-04T00:00:00.000Z", "2026-10-05T00:00:00.000Z"]
          : null;
    let requestedBounds: string[] = [];
    jest.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const query = new URL(String(url)).searchParams;
      requestedBounds =
        provider === "google"
          ? [query.get("timeMin")!, query.get("timeMax")!]
          : [query.get("startDateTime")!, query.get("endDateTime")!];
      return Response.json(provider === "google" ? {} : { value: [] });
    });
    const range = { from: "2026-10-04", until: "2026-10-04" };
    if (provider === "google")
      await listGoogleSyncedEvents("token", "calendar", range);
    else await listOutlookSyncedEvents("token", range);
    if (expected) expect(requestedBounds).toEqual(expected);
    else {
      const [start, end] = requestedBounds.map((value) => new Date(value));
      expect([
        start.getDate(),
        start.getHours(),
        end.getDate(),
        end.getHours(),
      ]).toEqual([4, 0, 5, 0]);
    }
  },
);

it("rejects an incomplete paginated listing rather than authorizing reconciliation", async () => {
  jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      Response.json({ items: [], nextPageToken: "second-page" }),
    )
    .mockResolvedValueOnce(
      Response.json(
        { error: { message: "Page unavailable" } },
        { status: 400 },
      ),
    );
  await expect(
    listGoogleSyncedEvents("token", "calendar", {
      from: "2026-10-04",
      until: "2026-10-04",
    }),
  ).rejects.toThrow("Page unavailable");
});
