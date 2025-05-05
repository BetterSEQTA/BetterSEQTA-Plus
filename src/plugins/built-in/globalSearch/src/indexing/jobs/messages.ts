import type { Job, IndexItem } from "../types";

const stripHtmlTags = (html: string) => html.replace(/<[^>]*>/g, "");

const fetchMessages = async (offset = 0, limit = 100) => {
  const res = await fetch(`${location.origin}/seqta/student/load/message`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      searchValue: "",
      sortBy: "date",
      sortOrder: "desc",
      action: "list",
      label: "inbox",
      offset,
      limit,
      datetimeUntil: null,
    }),
  });
  return res.json() as Promise<{
    payload: { hasMore: boolean; messages: any[]; ts: string };
    status: string;
  }>;
};

const fetchMessageContent = async (id: number) => {
  const res = await fetch(`${location.origin}/seqta/student/load/message`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ action: "message", id }),
  });
  return res.json() as Promise<{
    payload: { contents: string };
    status: string;
  }>;
};

interface MessagesProgress {
  offset: number;
  done: boolean;
}

export const messagesJob: Job = {
  id: "messages",
  label: "Messages",
  renderComponentId: "message",
  frequency: { type: "expiry", afterMs: 1000 * 60 * 60 * 24 },

  run: async (ctx) => {
    const limit = 100;
    const progress =
      (await ctx.getProgress<MessagesProgress>()) ?? { offset: 0, done: false };

    const existingIds = new Set(
      (await ctx.getStoredItems()).map((i) => i.id),
    );

    let consecutiveExisting = 0;

    while (!progress.done) {
      let list;
      try {
        list = await fetchMessages(progress.offset, limit);
      } catch (e) {
        console.error("[Messages job] list fetch failed:", e);
        break;
      }

      if (list.status !== "200") break;

      for (const msg of list.payload.messages) {
        const id = msg.id.toString();

        if (existingIds.has(id)) {
          consecutiveExisting += 1;
          if (consecutiveExisting >= 20) {
            progress.done = true;
            break;
          }
          continue;
        }
        consecutiveExisting = 0;

        let full;
        try {
          full = await fetchMessageContent(msg.id);
        } catch (e) {
          console.error(`[Messages job] content fetch failed (id ${id}):`, e);
          continue;
        }
        if (full.status !== "200") continue;

        const item: IndexItem = {
          id,
          text: msg.subject,
          category: "messages",
          content: `From: ${msg.sender}\n\n${stripHtmlTags(full.payload.contents)}`,
          dateAdded: new Date(msg.date).getTime(),
          metadata: {
            messageId: msg.id,
            author: msg.sender,
            senderId: msg.sender_id,
            senderType: msg.sender_type,
            timestamp: msg.date,
            hasAttachments: msg.attachments,
            attachmentCount: msg.attachmentCount,
            read: msg.read === 1,
          },
          actionId: "message",
          renderComponentId: "message",
        };

        await ctx.addItem(item);
        existingIds.add(id);
      }

      if (!list.payload.hasMore) progress.done = true;
      progress.offset += limit;
      await ctx.setProgress(progress);
    }

    if (progress.done) await ctx.setProgress({ offset: 0, done: false });

    return [];
  },

  purge: (items) => {
    const fourYears = Date.now() - 4 * 365 * 24 * 60 * 60 * 1000;
    return items.filter((i) => i.dateAdded >= fourYears);
  },
};