import type { Job, IndexItem } from "../types";

const fetchForums = async () => {
  const res = await fetch(`${location.origin}/seqta/student/load/forums`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ mode: "list" }),
  });

  return res.json() as Promise<{
    payload: { forums: any[] };
    status: string;
  }>;
};

export const forumsJob: Job = {
  id: "forums",
  label: "Forums",
  renderComponentId: "forum",
  frequency: { type: "expiry", afterMs: 30 * 24 * 60 * 60 * 1000 }, // 30 days

  run: async (ctx) => {
    const existingIds = new Set(
      (await ctx.getStoredItems("forums")).map((i) => i.id),
    );

    let list;
    try {
      list = await fetchForums();
    } catch (e) {
      console.error("[Forums job] list fetch failed:", e);
      return [];
    }

    if (list.status !== "200") return [];

    const items: IndexItem[] = [];

    for (const forum of list.payload.forums) {
      const id = forum.id.toString();
      if (existingIds.has(id)) continue;

      items.push({
        id,
        text: forum.title,
        category: "forums",
        content: `${forum.title}`,
        dateAdded: Date.now(),
        metadata: {
          forumId: forum.id,
          owner: forum.owner,
          title: forum.title,
          closed: forum.closed,
        },
        actionId: "forum",
        renderComponentId: "forum",
      });
    }

    return items;
  },

  /** Keep only forums from the last year. */
  purge: (items) => {
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    return items.filter((i) => i.dateAdded >= oneYearAgo);
  },
};