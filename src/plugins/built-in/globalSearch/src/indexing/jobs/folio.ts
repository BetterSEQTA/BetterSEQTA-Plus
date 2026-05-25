import type { IndexItem, Job } from "../types";
import { seqtaFetchPayload } from "../api";
import { htmlToPlainText } from "../utils";
import { delay } from "@/seqta/utils/delay";

/**
 * Indexes student folio entries from `/seqta/student/folio`.
 *
 * The list mode returns `{ me, list: [{ id, title, published, student }] }`,
 * and the load mode returns the full body via `{ contents, files, ... }`.
 * Folio bodies frequently contain `[[embed:raw|<html>]]` blocks which we
 * normalize to plain text before indexing - the htmlToPlainText sanitizer
 * never executes scripts because it parses into an inert document.
 */

interface FolioListPayload {
  me?: string;
  list?: Array<{
    id: number | string;
    title?: string;
    published?: string;
    student?: string;
  }>;
}

interface FolioEntryPayload {
  forum?: number;
  contents?: string;
  created?: string;
  allow_comments?: boolean;
  author?: { name?: string; year?: string; id?: number };
  files?: unknown[];
  id?: number | string;
  published?: string;
  title?: string;
  updated?: string;
}

const PER_ITEM_DELAY_MS = 80;

function stripEmbedRaw(text: string): string {
  if (!text) return "";
  return text.replace(/\[\[embed:raw\|([\s\S]*?)\]\]/g, (_match, inner) => {
    return htmlToPlainText(typeof inner === "string" ? inner : "");
  });
}

export const folioJob: Job = {
  id: "folio",
  label: "Folio",
  renderComponentId: "folio",
  frequency: { type: "expiry", afterMs: 1000 * 60 * 60 * 24 },

  boostCriteria: (_item, searchTerm) => {
    if (!searchTerm) return -30;
    return 0;
  },

  run: async (ctx) => {
    const stored = await ctx.getStoredItems("folio");
    const existing = new Map(stored.map((i) => [i.id, i]));

    const list = await seqtaFetchPayload<FolioListPayload | null>(
      "/seqta/student/folio",
      { mode: "list", page: 0, filters: {} },
    );
    if (!list || !Array.isArray(list.list)) return [];

    const items: IndexItem[] = [];
    for (const entry of list.list) {
      if (!entry || entry.id === undefined) continue;
      const id = `folio-${entry.id}`;
      const dateAdded = entry.published
        ? new Date(entry.published).getTime() || Date.now()
        : Date.now();

      // If we already have this folio and the title hasn't changed, reuse
      // the stored content instead of paying for another /folio?mode=load.
      const existingItem = existing.get(id);
      const titleChanged = existingItem && existingItem.text !== (entry.title ?? "");
      if (existingItem && !titleChanged) {
        items.push({
          ...existingItem,
          dateAdded,
        });
        continue;
      }

      try {
        const detail = await seqtaFetchPayload<FolioEntryPayload | null>(
          "/seqta/student/folio",
          { mode: "load", id: entry.id },
        );
        const rawContents = detail?.contents ?? "";
        const flattened = stripEmbedRaw(rawContents);
        const content = flattened.slice(0, 4000);

        items.push({
          id,
          text: entry.title?.trim() || `Folio ${entry.id}`,
          category: "folio",
          content,
          dateAdded,
          metadata: {
            folioId: entry.id,
            student: list.me ?? entry.student,
            publishedAt: entry.published,
            updatedAt: detail?.updated,
            createdAt: detail?.created,
            authorName: detail?.author?.name,
            authorId: detail?.author?.id,
            forumId: detail?.forum,
            allowComments: detail?.allow_comments,
            fileCount: Array.isArray(detail?.files) ? detail!.files!.length : 0,
            entityType: "folio",
            route: "/folios/read",
            icon: "\ueb16",
          },
          actionId: "folio",
          renderComponentId: "folio",
        });
      } catch (e) {
        console.warn(`[Folio job] Failed to load folio ${entry.id}:`, e);
      }

      await delay(PER_ITEM_DELAY_MS);
    }

    console.debug(`[Folio job] Indexed ${items.length} folio entries.`);
    return items;
  },

  purge: (items) => items,
};
