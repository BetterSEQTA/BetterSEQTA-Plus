import browser from "webextension-polyfill";
import {
  addPendingFeedbackId,
  findPendingFeedbackWithReplies,
  formatStatus,
  hasReply,
  removePendingFeedbackIds,
  validateFeedbackForm,
} from "./client";
import { BSPLUS_PENDING_FEEDBACK_IDS_KEY } from "./constants";
import { getOrCreateInstallId } from "./installId";

describe("validateFeedbackForm", () => {
  const base = {
    category: "bug" as const,
    subject: "Hi",
    message: "Long enough message here",
    includeContact: false,
    contactName: "",
    contactEmail: "",
    includeInstance: false,
  };

  it("requires message length", () => {
    expect(validateFeedbackForm({ ...base, message: "short" })).toMatch(/at least/);
  });

  it("requires email when contact included", () => {
    expect(
      validateFeedbackForm({
        ...base,
        includeContact: true,
        contactName: "Alex",
        contactEmail: "bad",
      }),
    ).toMatch(/email/i);
  });
});

describe("formatStatus / hasReply", () => {
  it("formats known statuses and detects replies", () => {
    expect(formatStatus("in_progress")).toBe("In progress");
    expect(
      hasReply({
        id: "fb_1",
        status: "resolved",
        category: "bug",
        subject: null,
        created_at: "",
        updated_at: "",
        has_response: true,
        response: "Thanks",
        responded_at: "",
      }),
    ).toBe(true);
  });
});

describe("pending feedback + reply check", () => {
  it("tracks pending ids and finds replies from the status list", async () => {
    await addPendingFeedbackId("fb_a");
    await addPendingFeedbackId("fb_b");
    await removePendingFeedbackIds(["fb_unused"]);

    const installId = await getOrCreateInstallId();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        install_id: installId,
        count: 2,
        items: [
          {
            id: "fb_a",
            status: "resolved",
            category: "bug",
            subject: "A",
            created_at: "",
            updated_at: "",
            has_response: true,
            response: "Fixed",
            responded_at: "",
          },
          {
            id: "fb_b",
            status: "received",
            category: "bug",
            subject: "B",
            created_at: "",
            updated_at: "",
            has_response: false,
            response: null,
            responded_at: null,
          },
        ],
      }),
      headers: new Headers(),
    }) as unknown as typeof fetch;

    const items = await findPendingFeedbackWithReplies();
    expect(items.map((i) => i.id)).toEqual(["fb_a"]);
    expect(browser.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        [BSPLUS_PENDING_FEEDBACK_IDS_KEY]: expect.any(Array),
      }),
    );
  });
});
