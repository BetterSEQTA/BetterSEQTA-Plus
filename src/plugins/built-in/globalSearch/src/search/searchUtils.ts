import Fuse, { type FuseResult } from "fuse.js";
import { getStaticCommands, type StaticCommandItem } from "../core/commands";
import { getDynamicItems } from "../utils/dynamicItems";
import type { CombinedResult } from "../core/types";
import type { IndexItem } from "../indexing/types";
import { searchVectors } from "./vector/vectorSearch";
import type { VectorSearchResult } from "./vector/vectorTypes";
import { jobs } from "../indexing/jobs";
import { hybridSearchWithExpansion } from "./hybridSearch";

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
    threshold: 0.5, // More permissive for better partial word matching (increased from 0.4)
    minMatchCharLength: 2, // Minimum 2 characters for Fuse.js matches (substring fallback handles shorter queries)
    distance: 100, // Increased to allow matches across longer strings
    useExtendedSearch: true,
    ignoreLocation: true, // Allow matches anywhere in the string for better partial word matching
    findAllMatches: true, // Enable to find all matches for better partial word support
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
  const queryLower = query.toLowerCase();
  const queryTrimmed = query.trim();
  
  // For short queries (3 chars or less), use a more permissive approach
  const isShortQuery = queryTrimmed.length <= 3;
  const searchLimit = Math.min(limit * 3, 50);
  
  // First, try Fuse.js search
  const searchResults = dynamicContentFuse.search(query, { limit: searchLimit });
  
  // For short queries, always do a simple substring match to supplement Fuse.js results
  // This ensures we catch partial word matches like "SAT" in "SAT 1: Differential Calculus"
  let additionalMatches: IndexItem[] = [];
  if (isShortQuery) {
    // Always do substring search for short queries to catch partial word matches
    for (const item of dynamicIdToItemMap.values()) {
      const textLower = item.text.toLowerCase();
      const contentLower = (item.content || '').toLowerCase();
      const subjectNameLower = (item.metadata?.subjectName || '').toLowerCase();
      const subjectCodeLower = (item.metadata?.subjectCode || '').toLowerCase();
      
      // Check if query appears anywhere in the text, content, or metadata
      if (textLower.includes(queryLower) || 
          contentLower.includes(queryLower) ||
          subjectNameLower.includes(queryLower) ||
          subjectCodeLower.includes(queryLower)) {
        // Only add if not already in Fuse.js results
        if (!searchResults.find(r => r.item.id === item.id)) {
          additionalMatches.push(item);
        }
      }
    }
  }

  const results = searchResults.map((result: FuseResult<IndexItem>) => {
    const item = result.item;
    const fuseScore = 10 * (1 - (result.score || 0.5));
    
    let score = fuseScore;

    // Recency boost
    const ageInDays = (now - item.dateAdded) / (1000 * 60 * 60 * 24);
    const recencyBoost = sortByRecent ? 1 / (ageInDays + 1) : 0;
    score += recencyBoost;
    
    // Boost for exact text matches (especially at the start)
    const textLower = item.text.toLowerCase();
    if (textLower.startsWith(queryLower)) {
      score += 5; // Strong boost for prefix matches
    } else if (textLower.includes(queryLower)) {
      score += 2; // Boost for substring matches
    }
    
    // Boost for category matches
    if (item.category.toLowerCase().includes(queryLower)) {
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
  
  // Add additional matches from simple substring search
  additionalMatches.forEach((item) => {
    // Check if already in results
    if (!results.find(r => r.id === item.id)) {
      const textLower = item.text.toLowerCase();
      let score = 5; // Base score for substring matches
      
      // Boost for prefix matches
      if (textLower.startsWith(queryLower)) {
        score += 5;
      }
      
      // Recency boost
      const ageInDays = (now - item.dateAdded) / (1000 * 60 * 60 * 24);
      const recencyBoost = sortByRecent ? 1 / (ageInDays + 1) : 0;
      score += recencyBoost;
      
      results.push({
        id: item.id,
        type: "dynamic" as const,
        score,
        item,
      });
    }
  });
  
  // Sort by score and return top results
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function performSearch(
  query: string,
  commandsFuse: Fuse<StaticCommandItem>,
  commandIdToItemMap: Map<string, StaticCommandItem>,
  dynamicContentFuse?: Fuse<IndexItem>,
  dynamicIdToItemMap?: Map<string, IndexItem>,
  sortByRecent: boolean = true,
): Promise<CombinedResult[]> {
  const trimmedQuery = query.trim().toLowerCase();
  
  // Check cache first
  if (trimmedQuery.length > 2) {
    const cached = getCachedResults(trimmedQuery);
    if (cached) {
      return cached;
    }
  }

  // Step 1: Get command results (these don't need hybrid search)
  const commandResults = searchCommands(
    commandsFuse,
    trimmedQuery,
    commandIdToItemMap,
  );

  // Step 2: Get BM25 results for dynamic items
  let dynamicResults: CombinedResult[] = [];
  if (dynamicContentFuse && dynamicIdToItemMap) {
    // Get BM25 results first (fast text-based search)
    const bm25Results = searchDynamicItems(
      dynamicContentFuse,
      trimmedQuery,
      dynamicIdToItemMap,
      50, // Get top 50 for reranking
      sortByRecent,
    );

    // Step 3: Apply hybrid search (BM25 + Vector reranking + boosting)
    if (trimmedQuery.length > 2 && bm25Results.length > 0) {
      try {
        // Get all items for expansion
        const allItems = Array.from(dynamicIdToItemMap.values());
        
        // Apply hybrid search with expansion
        dynamicResults = await hybridSearchWithExpansion(
          bm25Results,
          trimmedQuery,
          allItems,
          {
            bm25TopK: 50,
            finalLimit: 20, // Return top 20 after reranking
            recencyBoost: sortByRecent,
            bm25Weight: 0.4, // 40% BM25, 60% vector
            vectorWeight: 0.6,
            recencyWeight: 0.1,
          },
        );
      } catch (e) {
        console.warn("[Search] Hybrid search failed, using BM25 only:", e);
        // Fallback to BM25 only
        dynamicResults = bm25Results.slice(0, 20);
      }
    } else {
      // For very short queries or no BM25 results, use BM25 only
      dynamicResults = bm25Results.slice(0, 20);
    }
  }

  // Step 4: Combine command and dynamic results
  const allResults = [...commandResults, ...dynamicResults];
  
  // Sort by score (commands typically have higher priority)
  allResults.sort((a, b) => {
    // Commands always come first if scores are similar
    if (a.type === "command" && b.type === "dynamic") {
      return b.score - a.score - 10; // Commands get +10 boost
    }
    if (a.type === "dynamic" && b.type === "command") {
      return b.score - a.score + 10; // Commands get +10 boost
    }
    return b.score - a.score;
  });

  // Cache results for queries longer than 2 chars
  if (trimmedQuery.length > 2) {
    setCachedResults(trimmedQuery, allResults);
  }

  return allResults;
}
