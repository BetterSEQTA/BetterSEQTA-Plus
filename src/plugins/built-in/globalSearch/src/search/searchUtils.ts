import Fuse, { type FuseResult } from "fuse.js";
import { getStaticCommands, type StaticCommandItem } from "../core/commands";
import { getDynamicItems } from "../utils/dynamicItems";
import type { CombinedResult } from "../core/types";
import type { IndexItem } from "../indexing/types";
import { searchVectors } from "./vector/vectorSearch";
import type { VectorSearchResult } from "./vector/vectorTypes";
import { jobs } from "../indexing/jobs";

export function createSearchIndexes() {
  const commands = getStaticCommands();
  const dynamicItems = getDynamicItems();

  const commandOptions = {
    keys: ["text", "category", "keywords"],
    includeScore: true,
    includeMatches: true,
    threshold: 0.4,
    minMatchCharLength: 2,
    useExtendedSearch: false,
  };

  const dynamicOptions = {
    keys: [
      { name: "text", weight: 2 },
      { name: "content", weight: 1 },
      { name: "category", weight: 1 },
    ],
    includeScore: true,
    includeMatches: true,
    threshold: 0.4,
    minMatchCharLength: 2,
    distance: 100,
    useExtendedSearch: true,
  };

  return {
    commandsFuse: new Fuse(commands, commandOptions) as Fuse<StaticCommandItem>,
    dynamicContentFuse: new Fuse(
      dynamicItems,
      dynamicOptions,
    ) as Fuse<IndexItem>,
    commands,
    dynamicItems,
  };
}

export function searchCommands(
  commandsFuse: Fuse<StaticCommandItem>,
  query: string,
  commandIdToItemMap: Map<string, StaticCommandItem>,
  limit = 10,
): CombinedResult[] {
  if (!commandsFuse) return [];

  if (!query.trim()) {
    return Array.from(commandIdToItemMap.values())
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)) // Sort by priority when no query
      .slice(0, limit) // Limit results even when no query
      .map((item) => ({
        id: item.id,
        type: "command" as const,
        score: 100 + (item.priority ?? 0),
        item,
      }));
  }

  const searchResults = commandsFuse.search(query, { limit });

  return searchResults.map((result: FuseResult<StaticCommandItem>) => {
    const item = result.item;
    const fuseScore = 15 * (1 - (result.score || 0.5));
    const score = fuseScore + (item.priority ?? 0);

    return {
      id: item.id,
      type: "command" as const,
      score,
      item,
      matches: result.matches,
    };
  });
}

export function searchDynamicItems(
  dynamicContentFuse: Fuse<IndexItem>,
  query: string,
  dynamicIdToItemMap: Map<string, IndexItem>,
  limit = 10,
  sortByRecent: boolean = true,
): CombinedResult[] {
  if (!dynamicContentFuse) return [];

  if (!query.trim()) {
    let items = Array.from(dynamicIdToItemMap.values());
    if (sortByRecent) {
      items = items.sort((a, b) => b.dateAdded - a.dateAdded);
    }
    return items.slice(0, limit).map((item) => ({
      id: item.id,
      type: "dynamic" as const,
      score: 80,
      item,
    }));
  }

  const now = Date.now();
  const searchResults = dynamicContentFuse.search(query, { limit });

  return searchResults.map((result: FuseResult<IndexItem>) => {
    const item = result.item;
    const fuseScore = 10 * (1 - (result.score || 0.5));
    
    let score = fuseScore;

    const ageInDays = (now - item.dateAdded) / (1000 * 60 * 60 * 24);
    const recencyBoost = sortByRecent ? 1 / (ageInDays + 1) : 0;
    score += recencyBoost;

    return {
      id: item.id,
      type: "dynamic" as const,
      score,
      item,
      matches: result.matches,
    };
  });
}

export async function performSearch(
  query: string,
  commandsFuse: Fuse<StaticCommandItem>,
  commandIdToItemMap: Map<string, StaticCommandItem>,
): Promise<CombinedResult[]> {
  // Get all results first
  const commandResults = searchCommands(
    commandsFuse,
    query,
    commandIdToItemMap,
  );

  // Get vector results in parallel
  let vectorResults: VectorSearchResult[] = [];
  try {
    vectorResults = await searchVectors(query);
  } catch (e) {}

  // Create a map to store our final results, using ID as key to avoid duplicates
  const resultMap = new Map<string, CombinedResult>();

  // Add command results first (they keep their original scores)
  commandResults.forEach((r) => resultMap.set(r.id, r));

  // Process dynamic results and vector results together
  const seenIds = new Set<string>();

  vectorResults.forEach((v) => {
    const id = v.object.id;

    if (!seenIds.has(id)) {
      // This is a semantic match that Fuse missed - add it with the vector similarity as score
      let score = v.similarity * 0.5; // High base score for semantic matches
      const job = jobs[v.object.category];
      if (job && typeof job.boostCriteria === 'function') {
        const boost = job.boostCriteria(v.object, query);
        if (boost) {
          score += boost;
        }
      }
      resultMap.set(id, {
        id,
        type: "dynamic" as const,
        score,
        item: v.object,
      });
    }
  });

  // Convert to array and sort by score
  const results = Array.from(resultMap.values());
  results.sort((a, b) => b.score - a.score);

  return results;
}
