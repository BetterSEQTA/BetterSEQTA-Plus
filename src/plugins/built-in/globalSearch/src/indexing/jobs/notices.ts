import type { IndexItem, Job } from "../types";
import { seqtaFetchPayload } from "../api";
import { htmlToPlainText } from "../utils";
import { delay } from "@/seqta/utils/delay";

/**
 * Indexes daily notices from `/seqta/student/load/notices`.
 *
 * SEQTA returns notices keyed by date, so we sweep a sliding window
 * (default: 14 days back) the first time we run, then incrementally pull
 * the most recent days on subsequent runs. Sensitive routes are excluded
 * because notices are surfaced for the active student already.
 */

interface NoticeRecord {
  id?: number | string;
  title?: string;
  contents?: string;
  staff?: string;
  staff_id?: number;
  date?: string;
  label?: number;
  label_title?: string;
  colour?: string;
}

interface NoticesProgress {
  earliestDate: string | null;
  lastSweepBackTo: string | null;
}

const SWEEP_DAYS = 14;
const MAX_HISTORY_DAYS = 365;
const FETCH_DELAY_MS = 60;

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmd(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

const fetchNoticesForDate = async (date: string): Promise<NoticeRecord[]> => {
  const payload = await seqtaFetchPayload<NoticeRecord[] | { notices?: NoticeRecord[] } | null>(
    "/seqta/student/load/notices",
    { date },
  );
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray((payload as any).notices)) return (payload as any).notices;
  return [];
};

const fetchLabelLookup = async (): Promise<Map<number, string>> => {
  const payload = await seqtaFetchPayload<
    Array<{ id: number; title?: string }>
  >("/seqta/student/load/notices", { mode: "labels" });
  const map = new Map<number, string>();
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      if (entry && typeof entry.id === "number" && entry.title) {
        map.set(entry.id, entry.title);
      }
    }
  }
  return map;
};

export const noticesJob: Job = {
  id: "notices",
  label: "Notices",
  renderComponentId: "notice",
  frequency: { type: "expiry", afterMs: 1000 * 60 * 60 * 6 }, // 6 hours

  boostCriteria: (item, searchTerm) => {
    if (!searchTerm) return -10;
    let score = 0;
    const ts = item.metadata?.timestamp;
    if (typeof ts === "string") {
      const ageDays =
        (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays >= 0 && ageDays <= 7) score += 0.05;
    }
    return score;
  },

  run: async (ctx) => {
    const stored = await ctx.getStoredItems("notices");
    const existingIds = new Set(stored.map((i) => i.id));
    const progress = (await ctx.getProgress<NoticesProgress>()) ?? {
      earliestDate: null,
      lastSweepBackTo: null,
    };

    const labelLookup = await fetchLabelLookup();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sweep window: always the most recent SWEEP_DAYS, plus extend further
    // back the first time we run until we hit MAX_HISTORY_DAYS.
    const earliestEverIso = formatYmd(
      new Date(today.getTime() - MAX_HISTORY_DAYS * 86_400_000),
    );

    const dates: string[] = [];
    for (let offset = 0; offset < SWEEP_DAYS; offset++) {
      const day = new Date(today.getTime() - offset * 86_400_000);
      dates.push(formatYmd(day));
    }
    if (
      !progress.lastSweepBackTo ||
      progress.lastSweepBackTo > earliestEverIso
    ) {
      // Walk backwards in batches of ~30 days per run so we don't blow up
      // a single indexing pass.
      const startBack = parseYmd(progress.lastSweepBackTo) ?? today;
      const targetBack = new Date(startBack.getTime() - 30 * 86_400_000);
      const minBack = parseYmd(earliestEverIso) ?? targetBack;
      const stopBack = targetBack < minBack ? minBack : targetBack;
      for (
        let cursor = new Date(startBack.getTime() - SWEEP_DAYS * 86_400_000);
        cursor >= stopBack;
        cursor = new Date(cursor.getTime() - 86_400_000)
      ) {
        dates.push(formatYmd(cursor));
      }
      progress.lastSweepBackTo = formatYmd(stopBack);
    }

    const items: IndexItem[] = [];
    const seen = new Set<string>();

    for (const date of dates) {
      try {
        const notices = await fetchNoticesForDate(date);
        for (const notice of notices) {
          if (!notice || (notice.id === undefined && !notice.title)) continue;
          const id = `notice-${date}-${notice.id ?? notice.title}`;
          if (seen.has(id)) continue;
          seen.add(id);

          const labelTitle =
            notice.label_title ??
            (typeof notice.label === "number"
              ? labelLookup.get(notice.label) ?? null
              : null);

          const bodyText = notice.contents
            ? htmlToPlainText(notice.contents)
            : "";

          items.push({
            id,
            text: notice.title?.trim() || `Notice ${notice.id ?? date}`,
            category: "notices",
            content: bodyText.slice(0, 4000),
            dateAdded: new Date(date).getTime(),
            metadata: {
              noticeId: notice.id,
              date,
              author: notice.staff,
              authorId: notice.staff_id,
              label: labelTitle,
              labelId: notice.label,
              colour: notice.colour,
              timestamp: date,
              entityType: "notice",
              route: "/notices",
              icon: "\ueb24",
            },
            actionId: "notice",
            renderComponentId: "notice",
          });
        }
      } catch (e) {
        console.warn(`[Notices job] Failed to fetch notices for ${date}:`, e);
      }
      await delay(FETCH_DELAY_MS);
    }

    if (items.length > 0) {
      const dateStrings = items
        .map((i) => i.metadata?.date as string | undefined)
        .filter((d): d is string => !!d);
      if (dateStrings.length > 0) {
        const earliest = dateStrings.sort()[0];
        if (
          !progress.earliestDate ||
          earliest < progress.earliestDate
        ) {
          progress.earliestDate = earliest;
        }
      }
    }

    await ctx.setProgress(progress);

    const newCount = items.filter((i) => !existingIds.has(i.id)).length;
    console.debug(
      `[Notices job] Indexed ${items.length} notices across ${dates.length} dates (${newCount} new).`,
    );
    return items;
  },

  purge: (items) => {
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    return items.filter((i) => i.dateAdded >= oneYearAgo);
  },
};
