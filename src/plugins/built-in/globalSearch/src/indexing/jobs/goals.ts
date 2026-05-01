import type { IndexItem, Job } from "../types";
import { seqtaFetchPayload } from "../api";
import { extractTextFromValue } from "../extract";
import { delay } from "@/seqta/utils/delay";

/**
 * Indexes student goals from `/seqta/student/load/goals`.
 *
 * The endpoint exposes `mode: "years"` which returns the list of available
 * years and `mode: "list"` (per-year) which returns the actual goals. We
 * gracefully degrade if the school has goals disabled (the years payload
 * is empty in that case).
 */

interface GoalEntry {
  id?: number | string;
  uuid?: string;
  title?: string;
  description?: string;
  status?: string;
  year?: number | string;
  created?: string;
  updated?: string;
}

const PER_YEAR_DELAY_MS = 80;

export const goalsJob: Job = {
  id: "goals",
  label: "Goals",
  renderComponentId: "goal",
  frequency: { type: "expiry", afterMs: 1000 * 60 * 60 * 24 * 3 }, // every 3 days

  boostCriteria: (_item, searchTerm) => {
    if (!searchTerm) return -40;
    return 0;
  },

  run: async (_ctx) => {
    const years = await seqtaFetchPayload<Array<string | number> | null>(
      "/seqta/student/load/goals",
      { mode: "years" },
    );
    if (!Array.isArray(years) || years.length === 0) {
      console.debug("[Goals job] No goal years available; skipping.");
      return [];
    }

    const items: IndexItem[] = [];
    const seen = new Set<string>();

    for (const year of years) {
      try {
        const yearGoals = await seqtaFetchPayload<GoalEntry[] | null>(
          "/seqta/student/load/goals",
          { mode: "list", year },
        );
        if (!Array.isArray(yearGoals)) continue;

        for (const goal of yearGoals) {
          if (!goal) continue;
          const stableId = goal.uuid ?? goal.id;
          if (stableId === undefined || stableId === null) continue;
          const id = `goal-${stableId}`;
          if (seen.has(id)) continue;
          seen.add(id);

          const title =
            goal.title?.trim() || goal.description?.slice(0, 80) || `Goal ${stableId}`;
          const dateAdded = goal.updated || goal.created
            ? new Date(goal.updated ?? goal.created!).getTime() || Date.now()
            : Date.now();

          items.push({
            id,
            text: title,
            category: "goals",
            content: extractTextFromValue(
              { description: goal.description, status: goal.status },
              { maxChars: 1000 },
            ),
            dateAdded,
            metadata: {
              goalId: goal.id,
              goalUuid: goal.uuid,
              status: goal.status,
              year: goal.year ?? year,
              createdAt: goal.created,
              updatedAt: goal.updated,
              entityType: "goal",
              route: `/goals/${year}`,
              icon: "\uea15",
            },
            actionId: "goal",
            renderComponentId: "goal",
          });
        }
      } catch (e) {
        console.warn(`[Goals job] Failed to fetch goals for year ${year}:`, e);
      }
      await delay(PER_YEAR_DELAY_MS);
    }

    console.debug(`[Goals job] Indexed ${items.length} goal entries.`);
    return items;
  },

  purge: (items) => items,
};
