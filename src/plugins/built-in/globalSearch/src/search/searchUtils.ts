import Fuse, { type FuseResult } from "fuse.js";
import { getStaticCommands, type StaticCommandItem } from "../core/commands";
import { getDynamicItems } from "../utils/dynamicItems";
import type { CombinedResult } from "../core/types";
import type { IndexItem } from "../indexing/types";
import { dedupeCombinedResultsByCourseNav, dedupeIndexItemsForSearch } from "./dedupeIndexItems";
import { hybridSearchWithExpansion } from "./hybridSearch";
import {
  getLexicalMatchQuality,
  isStrongLexicalMatch,
  STRONG_LEXICAL_THRESHOLD,
} from "./lexicalMatch";

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
    if (firstKey !== undefined) {
      searchCache.delete(firstKey);
    }
  }
  searchCache.set(query, { results, timestamp: Date.now() });
}

/**
 * Clears the search result cache
 */
export function clearSearchCache(): void {
  searchCache.clear();
  console.debug("[Search] Search result cache cleared");
}

// Listen for cache clear events (e.g., on extension update)
if (typeof window !== 'undefined') {
  window.addEventListener('betterseqta-clear-search-cache', () => {
    clearSearchCache();
  });
}

export function createSearchIndexes() {
  clearSearchCache();
  const commands = getStaticCommands();
  const dynamicItems = dedupeIndexItemsForSearch(getDynamicItems());

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

  // Optimized dynamic content search options.
  // The expanded corpus mixes structured entities (assessments, subjects)
  // with free-form text (course content, notices, folio bodies, passive
  // captures) so we list a broad set of metadata keys while keeping titles
  // dominant in the ranking.
  // NOTE: metadata.route is intentionally excluded. Raw API paths like
  // `/seqta/student/load/message/people` should never influence ranking — they
  // historically caused passive-capture support records to bubble up above
  // real assessments when the user typed substrings that happened to appear in
  // the path.
  const dynamicOptions = {
    keys: [
      { name: "text", weight: 3 }, // Title is king
      { name: "content", weight: 1 },
      { name: "category", weight: 0.4 },
      { name: "metadata.subjectName", weight: 1.6 },
      { name: "metadata.subjectCode", weight: 1.6 },
      { name: "metadata.subject", weight: 1.4 },
      { name: "metadata.courseCode", weight: 1.2 },
      { name: "metadata.filename", weight: 1.2 },
      { name: "metadata.author", weight: 0.8 },
      { name: "metadata.authorName", weight: 0.8 },
      { name: "metadata.label", weight: 0.6 },
      { name: "metadata.categoryName", weight: 0.6 },
      { name: "metadata.entityType", weight: 0.4 },
    ],
    includeScore: true,
    includeMatches: true,
    threshold: 0.5,
    minMatchCharLength: 2,
    distance: 100,
    useExtendedSearch: true,
    ignoreLocation: true,
    findAllMatches: true,
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

    // Lexical title bonus — sticky across adjacent keystrokes so a strong
    // title prefix match like `world wa` doesn't disappear from the top once
    // vector reranking kicks in.
    const lexicalQuality = getLexicalMatchQuality(item, queryLower);
    if (lexicalQuality > 0) {
      score += lexicalQuality;
      // Curated-content boost: assessments and assignments with a strong
      // title match should be elevated further, since they are the items
      // users are most often hunting for.
      if (
        lexicalQuality >= STRONG_LEXICAL_THRESHOLD &&
        (item.category === "assignments" || item.category === "assessments")
      ) {
        score += 4;
      }
    }

    // Category match (small nudge)
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
    if (!results.find(r => r.id === item.id)) {
      let score = 5; // Base score for substring matches

      const lexicalQuality = getLexicalMatchQuality(item, queryLower);
      score += lexicalQuality;

      const ageInDays = (now - item.dateAdded) / (1000 * 60 * 60 * 24);
      const recencyBoost = sortByRecent ? 1 / (ageInDays + 1) : 0;
      score += recencyBoost;

      results.push({
        id: item.id,
        type: "dynamic" as const,
        score,
        item,
        matches: undefined,
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

    // Step 2b: Always include strong lexical title matches, even if Fuse
    // missed them with the current threshold. This is the safety net that
    // stops `world wa` from dropping a `World War 2 Essay` assessment that
    // `world w` happily showed.
    const allItems = Array.from(dynamicIdToItemMap.values());
    const seen = new Set(bm25Results.map((r) => r.id));
    const lexicalAdds: CombinedResult[] = [];
    for (const item of allItems) {
      if (seen.has(item.id)) continue;
      if (!isStrongLexicalMatch(item, trimmedQuery)) continue;
      const quality = getLexicalMatchQuality(item, trimmedQuery);
      let score = 6 + quality;
      if (item.category === "assignments" || item.category === "assessments") {
        score += 4;
      }
      lexicalAdds.push({
        id: item.id,
        type: "dynamic" as const,
        score,
        item,
        matches: undefined,
      });
    }
    if (lexicalAdds.length > 0) {
      bm25Results.push(...lexicalAdds);
      bm25Results.sort((a, b) => b.score - a.score);
    }

    // Step 3: Apply hybrid search (BM25 + Vector reranking + boosting)
    if (trimmedQuery.length > 2 && bm25Results.length > 0) {
      try {
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

  const dedupedResults = dedupeCombinedResultsByCourseNav(allResults);
  dedupedResults.sort((a, b) => {
    if (a.type === "command" && b.type === "dynamic") {
      return b.score - a.score - 10;
    }
    if (a.type === "dynamic" && b.type === "command") {
      return b.score - a.score + 10;
    }
    return b.score - a.score;
  });

  // Cache results for queries longer than 2 chars
  if (trimmedQuery.length > 2) {
    setCachedResults(trimmedQuery, dedupedResults);
  }

  return dedupedResults;
}
