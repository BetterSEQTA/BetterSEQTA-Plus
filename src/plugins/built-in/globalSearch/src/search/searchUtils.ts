import Fuse, { type FuseResult } from "fuse.js";
import { getStaticCommands, type StaticCommandItem } from "../core/commands";
import { getDynamicItems } from "../utils/dynamicItems";
import type { CombinedResult } from "../core/types";
import type { IndexItem } from "../indexing/types";
import { searchVectors } from "./vector/vectorSearch";
import type { VectorSearchResult } from "./vector/vectorTypes";

export function createSearchIndexes() {
  const commands = getStaticCommands();
  const dynamicItems = getDynamicItems();

  const commandOptions = {
    keys: ["text", "category", "keywords"],
    includeScore: true,
    includeMatches: true,
    threshold: 0.6,
    minMatchCharLength: 1,
    ignoreLocation: true,
    useExtendedSearch: false,
  };

  const dynamicOptions = {
    keys: [
      "text",
      "content",
      "category",
      "metadata.author",
      "metadata.subject",
    ],
    includeScore: true,
    includeMatches: true,
    threshold: 0.6,
    minMatchCharLength: 3,
    distance: 50,
    useExtendedSearch: false,
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
  sortByRecent: boolean = true, // Added option to control sorting
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
      score: 80, // Assign a default score for non-searched items
      item,
    }));
  }

  const now = Date.now();
  const searchResults = dynamicContentFuse.search(query, { limit });

  return searchResults.map((result: FuseResult<IndexItem>) => {
    const item = result.item;
    const fuseScore = 10 * (1 - (result.score || 0.5));
    const ageInDays = (now - item.dateAdded) / (1000 * 60 * 60 * 24);
    const recencyBoost = sortByRecent ? 1 / (ageInDays + 1) : 0; // Apply boost only if sorting by recent
    const score = fuseScore + recencyBoost;

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
  dynamicContentFuse: Fuse<IndexItem>,
  commandIdToItemMap: Map<string, StaticCommandItem>,
  dynamicIdToItemMap: Map<string, IndexItem>,
  showRecentFirst: boolean,
): Promise<CombinedResult[]> {
  // Get all results first
  const commandResults = searchCommands(
    commandsFuse,
    query,
    commandIdToItemMap,
  );
  const dynamicResults = searchDynamicItems(
    dynamicContentFuse,
    query,
    dynamicIdToItemMap,
    10,
    showRecentFirst,
  );

  // Get vector results in parallel
  let vectorResults: VectorSearchResult[] = [];
  try {
    vectorResults = await searchVectors(query, 10);
  } catch (e) {}

  // Create a map to store our final results, using ID as key to avoid duplicates
  const resultMap = new Map<string, CombinedResult>();

  // Add command results first (they keep their original scores)
  commandResults.forEach((r) => resultMap.set(r.id, r));

  // Process dynamic results and vector results together
  const seenIds = new Set<string>();

  // Add dynamic results first
  dynamicResults.forEach((r) => {
    seenIds.add(r.id);
    const vectorMatch = vectorResults.find((v) => v.object.id === r.id);
    if (vectorMatch) {
      // If we found it in both searches, combine the scores
      resultMap.set(r.id, {
        ...r,
        score: r.score + vectorMatch.similarity * 0.6, // Boost exact matches
      });
    } else {
      // If only in Fuse results, keep as is
      resultMap.set(r.id, r);
    }
  });

  // Now add any vector results we haven't seen yet
  vectorResults.forEach((v) => {
    const id = v.object.id;

    if (!seenIds.has(id)) {
      // This is a semantic match that Fuse missed - add it with the vector similarity as score
      resultMap.set(id, {
        id,
        type: "dynamic" as const,
        score: v.similarity * 0.9, // High base score for semantic matches
        item: v.object,
      });
    }
  });

  // Convert to array and sort by score
  const results = Array.from(resultMap.values());
  results.sort((a, b) => b.score - a.score);

  return results;
}
