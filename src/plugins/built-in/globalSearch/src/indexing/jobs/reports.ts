import type { IndexItem, Job } from "../types";
import { seqtaFetchPayload } from "../api";

/**
 * Indexes report metadata from `/seqta/student/load/reports`.
 *
 * Reports are PDFs gated behind SEQTA's authenticated download endpoint, so
 * we only index the human-readable metadata (year, term, title, file UUID)
 * and a stable hash route so the search palette can deep-link straight
 * into the reports page.
 */

interface ReportEntry {
  id?: number | string;
  uuid?: string;
  title?: string;
  description?: string;
  date_published?: string;
  date_created?: string;
  year?: number | string;
  term?: number | string;
  metaclass?: number;
  programme?: number;
  filename?: string;
}

export const reportsJob: Job = {
  id: "reports",
  label: "Reports",
  renderComponentId: "report",
  frequency: { type: "expiry", afterMs: 1000 * 60 * 60 * 24 }, // daily

  boostCriteria: (_item, searchTerm) => {
    if (!searchTerm) return -25;
    return 0;
  },

  run: async (_ctx) => {
    const payload = await seqtaFetchPayload<ReportEntry[] | null>(
      "/seqta/student/load/reports",
      {},
    );
    if (!Array.isArray(payload)) return [];

    const items: IndexItem[] = [];
    const seen = new Set<string>();

    for (const report of payload) {
      if (!report) continue;
      const stableId = report.uuid ?? report.id;
      if (stableId === undefined || stableId === null) continue;
      const id = `report-${stableId}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const title = report.title?.trim() || `Report ${stableId}`;
      const dateAdded = report.date_published
        ? new Date(report.date_published).getTime() || Date.now()
        : Date.now();

      const contentParts: string[] = [];
      if (report.description) contentParts.push(report.description);
      if (report.year) contentParts.push(`Year ${report.year}`);
      if (report.term) contentParts.push(`Term ${report.term}`);
      if (report.date_published) contentParts.push(report.date_published);

      items.push({
        id,
        text: title,
        category: "reports",
        content: contentParts.join(" \u2022 "),
        dateAdded,
        metadata: {
          reportId: report.id,
          reportUuid: report.uuid,
          year: report.year,
          term: report.term,
          metaclass: report.metaclass,
          programme: report.programme,
          publishedAt: report.date_published,
          createdAt: report.date_created,
          filename: report.filename,
          entityType: "report",
          route: "/reports",
          icon: "\ueb70",
        },
        actionId: "report",
        renderComponentId: "report",
      });
    }

    console.debug(`[Reports job] Indexed ${items.length} reports.`);
    return items;
  },

  purge: (items) => items,
};
