import Fuse, { type FuseResult } from "fuse.js";
import { getStaticCommands, type StaticCommandItem } from "../core/commands";
import { getDynamicItems } from "../utils/dynamicItems";
import type { CombinedResult } from "../core/types";
import type { IndexItem } from "../indexing/types";
import { searchVectors } from "./vector/vectorSearch";
import type { VectorSearchResult } from "./vector/vectorTypes";
import { jobs } from "../indexing/jobs";

// Search result cache for better performance
const searchCache = new Map<string, { results: CombinedResult[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const MAX_CACHE_SIZE = 100;

function getCachedResults(query: string): CombinedResult[] | null {
  const cached = searchCache.get(query);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }
  return null;
}

function setCachedResults(query: string, results: CombinedResult[]) {
  // Limit cache size
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(query, { results, timestamp: Date.now() });
}

export function createSearchIndexes() {
  const commands = getStaticCommands();
  const dynamicItems = getDynamicItems();

  // Optimized command search options
  const commandOptions = {
    keys: ["text", "category", "keywords"],
    includeScore: true,
    includeMatches: true,
    threshold: 0.35, // Slightly more permissive for better recall
    minMatchCharLength: 2,
    useExtendedSearch: false,
    ignoreLocation: false,
    findAllMatches: false, // Performance optimization
  };

  // Optimized dynamic content search options
  const dynamicOptions = {
    keys: [
      { name: "text", weight: 3 }, // Increased weight for title matches
      { name: "content", weight: 1 },
      { name: "category", weight: 0.5 }, // Lower weight for category
      { name: "metadata.subjectName", weight: 1.5 }, // Boost subject name matches
      { name: "metadata.subjectCode", weight: 1.5 }, // Boost subject code matches
    ],
    includeScore: true,
    includeMatches: true,
    threshold: 0.35, // Slightly more permissive
    minMatchCharLength: 2,
    distance: 50, // Reduced from 100 for better performance
    useExtendedSearch: true,
    ignoreLocation: false,
    findAllMatches: false, // Performance optimization
    shouldSort: true,
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
  // Increase limit for better results, then trim later
  const searchLimit = Math.min(limit * 3, 50);
  const searchResults = dynamicContentFuse.search(query, { limit: searchLimit });

  const results = searchResults.map((result: FuseResult<IndexItem>) => {
    const item = result.item;
    const fuseScore = 10 * (1 - (result.score || 0.5));
    
    let score = fuseScore;

    // Recency boost
    const ageInDays = (now - item.dateAdded) / (1000 * 60 * 60 * 24);
    const recencyBoost = sortByRecent ? 1 / (ageInDays + 1) : 0;
    score += recencyBoost;
    
    // Boost for exact text matches
    if (item.text.toLowerCase().includes(query.toLowerCase())) {
      score += 2;
    }
    
    // Boost for category matches
    if (item.category.toLowerCase().includes(query.toLowerCase())) {
      score += 1;
    }

    return {
      id: item.id,
      type: "dynamic" as const,
      score,
      item,
      matches: result.matches,
    };
  });
  
  // Sort by score and return top results
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function performSearch(
  query: string,
  commandsFuse: Fuse<StaticCommandItem>,
  commandIdToItemMap: Map<string, StaticCommandItem>,
): Promise<CombinedResult[]> {
  const trimmedQuery = query.trim().toLowerCase();
  
  // Check cache first
  if (trimmedQuery.length > 2) {
    const cached = getCachedResults(trimmedQuery);
    if (cached) {
      return cached;
    }
  }

  // Get all results first
  const commandResults = searchCommands(
    commandsFuse,
    trimmedQuery,
    commandIdToItemMap,
  );

  // Get vector results in parallel (only for queries longer than 3 chars for performance)
  let vectorResults: VectorSearchResult[] = [];
  if (trimmedQuery.length > 3) {
    try {
      vectorResults = await searchVectors(trimmedQuery, 15); // Reduced from 20 for performance
    } catch (e) {
      console.warn("[Search] Vector search failed:", e);
    }
  }

  // Create a map to store our final results, using ID as key to avoid duplicates
  const resultMap = new Map<string, CombinedResult>();

  // Add command results first (they keep their original scores)
  commandResults.forEach((r) => resultMap.set(r.id, r));

  // Process vector results
  const seenIds = new Set<string>();
  commandResults.forEach((r) => seenIds.add(r.id));

  vectorResults.forEach((v) => {
    const id = v.object.id;

    if (!seenIds.has(id)) {
      // This is a semantic match that Fuse missed - add it with the vector similarity as score
      let score = v.similarity * 0.5; // High base score for semantic matches
      const job = jobs[v.object.category];
      if (job && typeof job.boostCriteria === 'function') {
        const boost = job.boostCriteria(v.object, trimmedQuery);
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
      seenIds.add(id);
    }
  });

  // Convert to array and sort by score
  const results = Array.from(resultMap.values());
  results.sort((a, b) => b.score - a.score);

  // Cache results for queries longer than 2 chars
  if (trimmedQuery.length > 2) {
    setCachedResults(trimmedQuery, results);
  }

  return results;
}
