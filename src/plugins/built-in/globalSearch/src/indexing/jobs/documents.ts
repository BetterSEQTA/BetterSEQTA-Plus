import type { IndexItem, Job } from "../types";
import { seqtaFetchPayload } from "../api";

/**
 * Indexes file metadata from `/seqta/student/load/documents`.
 *
 * Each top-level entry is a category containing one or more documents
 * (`docs[]`). We capture the human-readable title, filename, mimetype, and
 * stable UUID/category for every doc, but never download or index the
 * binary content itself - the document streaming endpoint uses one-time
 * JWTs that are unsafe to persist or replay.
 */

interface DocumentEntry {
  file?: number | string;
  filename?: string;
  size?: string | number;
  context_uuid?: string;
  mimetype?: string;
  created_date?: string;
  title?: string;
  uuid?: string;
  created_by?: string;
}

interface DocumentCategory {
  id: number | string;
  category: string;
  colour?: string;
  docs: DocumentEntry[];
}

function prettySize(size: string | number | undefined): string | null {
  if (size === undefined || size === null) return null;
  const bytes = typeof size === "string" ? parseInt(size, 10) : size;
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function describeMime(mime: string | undefined): string | null {
  if (!mime) return null;
  if (mime.startsWith("application/pdf")) return "PDF";
  if (mime.includes("officedocument.wordprocessingml")) return "Word";
  if (mime.includes("officedocument.spreadsheetml")) return "Excel";
  if (mime.includes("officedocument.presentationml")) return "PowerPoint";
  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Audio";
  return null;
}

export const documentsJob: Job = {
  id: "documents",
  label: "Documents",
  renderComponentId: "document",
  frequency: { type: "expiry", afterMs: 1000 * 60 * 60 * 12 }, // 12 hours

  boostCriteria: (_item, searchTerm) => {
    if (!searchTerm) return -20;
    return 0;
  },

  run: async (_ctx) => {
    const payload = await seqtaFetchPayload<DocumentCategory[] | null>(
      "/seqta/student/load/documents",
      {},
    );
    if (!Array.isArray(payload)) return [];

    const items: IndexItem[] = [];
    const seen = new Set<string>();

    for (const category of payload) {
      if (!category || !Array.isArray(category.docs)) continue;
      for (const doc of category.docs) {
        const uuid = doc.uuid || doc.context_uuid;
        if (!uuid && !doc.file) continue;
        const id = `document-${uuid ?? doc.file}`;
        if (seen.has(id)) continue;
        seen.add(id);

        const title =
          doc.title?.trim() ||
          doc.filename?.trim() ||
          `Document ${doc.file ?? uuid}`;

        const sizeText = prettySize(doc.size);
        const mimeLabel = describeMime(doc.mimetype);

        const contentParts: string[] = [];
        if (doc.filename && doc.filename !== title) contentParts.push(doc.filename);
        if (category.category) contentParts.push(`Category: ${category.category}`);
        if (mimeLabel) contentParts.push(mimeLabel);
        if (sizeText) contentParts.push(sizeText);
        if (doc.created_date) contentParts.push(`Added ${doc.created_date}`);

        const dateAdded = doc.created_date
          ? new Date(doc.created_date).getTime() || Date.now()
          : Date.now();

        items.push({
          id,
          text: title,
          category: "documents",
          content: contentParts.join(" \u2022 "),
          dateAdded,
          metadata: {
            documentUuid: uuid,
            fileId: doc.file,
            filename: doc.filename,
            mimetype: doc.mimetype,
            sizeBytes:
              typeof doc.size === "string" ? parseInt(doc.size, 10) : doc.size,
            categoryId: category.id,
            categoryName: category.category,
            createdDate: doc.created_date,
            entityType: "document",
            route: "/documents",
            icon: "\ueb6f",
          },
          actionId: "document",
          renderComponentId: "document",
        });
      }
    }

    console.debug(`[Documents job] Indexed ${items.length} document entries.`);
    return items;
  },

  purge: (items) => items,
};
