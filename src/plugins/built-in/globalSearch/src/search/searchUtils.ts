import Fuse, { type FuseResult } from "fuse.js"; // Import Fuse.js for fuzzy searching
import { getStaticCommands, type StaticCommandItem } from "../core/commands"; // Import static command items and function to fetch them
import { getDynamicItems } from "../utils/dynamicItems"; // Import dynamic items fetching function
import type { CombinedResult } from "../core/types"; // Import CombinedResult type for unified search results
import type { IndexItem } from "../indexing/types"; // Import IndexItem type used for dynamic items
import { searchVectors } from "./vector/vectorSearch"; // Import the vector search function for semantic searches
import type { VectorSearchResult } from "./vector/vectorTypes"; // Import VectorSearchResult type for the results from vector search

// Function to create search indexes using Fuse for both static and dynamic items
export function createSearchIndexes() {
  const commands = getStaticCommands(); // Get static commands
  const dynamicItems = getDynamicItems(); // Get dynamic items

  // Options for Fuse search on static commands
  const commandOptions = {
    keys: ["text", "category", "keywords"], // Fields to search in static commands
    includeScore: true, // Include score in the results
    includeMatches: true, // Include matching parts in the results
    threshold: 0.4, // Threshold for fuzzy matching
    minMatchCharLength: 2, // Minimum match length
    useExtendedSearch: false, // Disable extended search features
  };

  // Options for Fuse search on dynamic items
  const dynamicOptions = {
    keys: [
      "text",
      "content",
      "category",
      "metadata.author",
      "metadata.subject",
    ], // Fields to search in dynamic items
    includeScore: true, // Include score in the results
    includeMatches: true, // Include matching parts in the results
    threshold: 0.6, // Threshold for fuzzy matching
    minMatchCharLength: 3, // Minimum match length
    distance: 50, // Search distance for fuzzy matching
    useExtendedSearch: false, // Disable extended search features
  };

  return {
    commandsFuse: new Fuse(commands, commandOptions) as Fuse<StaticCommandItem>, // Create Fuse instance for static commands
    dynamicContentFuse: new Fuse(dynamicItems, dynamicOptions) as Fuse<IndexItem>, // Create Fuse instance for dynamic items
    commands, // Return the raw list of static commands
    dynamicItems, // Return the raw list of dynamic items
  };
}

// Function to search static commands using Fuse
export function searchCommands(
  commandsFuse: Fuse<StaticCommandItem>,
  query: string,
  commandIdToItemMap: Map<string, StaticCommandItem>,
  limit = 10, // Limit for number of results
): CombinedResult[] {
  if (!commandsFuse) return []; // Return empty if no Fuse instance exists

  if (!query.trim()) {
    // If no query, return all commands sorted by priority
    return Array.from(commandIdToItemMap.values())
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)) // Sort by priority
      .slice(0, limit) // Limit results
      .map((item) => ({
        id: item.id,
        type: "command" as const,
        score: 100 + (item.priority ?? 0), // High score based on priority
        item,
      }));
  }

  // Perform search using Fuse
  const searchResults = commandsFuse.search(query, { limit });

  return searchResults.map((result: FuseResult<StaticCommandItem>) => {
    const item = result.item;
    const fuseScore = 15 * (1 - (result.score || 0.5)); // Adjust score based on Fuse match score
    const score = fuseScore + (item.priority ?? 0); // Combine Fuse score with command priority

    return {
      id: item.id,
      type: "command" as const,
      score,
      item,
      matches: result.matches, // Include matches for the query
    };
  });
}

// Function to search dynamic items using Fuse
export function searchDynamicItems(
  dynamicContentFuse: Fuse<IndexItem>,
  query: string,
  dynamicIdToItemMap: Map<string, IndexItem>,
  limit = 10,
  sortByRecent: boolean = true, // Option to sort by recency
): CombinedResult[] {
  if (!dynamicContentFuse) return []; // Return empty if no Fuse instance exists

  if (!query.trim()) {
    // If no query, return all dynamic items sorted by recency if needed
    let items = Array.from(dynamicIdToItemMap.values());
    if (sortByRecent) {
      items = items.sort((a, b) => b.dateAdded - a.dateAdded); // Sort by dateAdded if sortByRecent is true
    }
    return items.slice(0, limit).map((item) => ({
      id: item.id,
      type: "dynamic" as const,
      score: 80, // Default score for non-searched items
      item,
    }));
  }

  const now = Date.now(); // Get current timestamp
  const searchResults = dynamicContentFuse.search(query, { limit });

  return searchResults.map((result: FuseResult<IndexItem>) => {
    const item = result.item;
    const fuseScore = 10 * (1 - (result.score || 0.5)); // Adjust score based on Fuse match score
    const ageInDays = (now - item.dateAdded) / (1000 * 60 * 60 * 24); // Calculate item age in days
    const recencyBoost = sortByRecent ? 1 / (ageInDays + 1) : 0; // Boost score based on recency if needed
    const score = fuseScore + recencyBoost; // Combine Fuse score with recency boost

    return {
      id: item.id,
      type: "dynamic" as const,
      score,
      item,
      matches: result.matches, // Include matches for the query
    };
  });
}

// Perform a comprehensive search combining static, dynamic, and vector-based searches
export async function performSearch(
  query: string,
  commandsFuse: Fuse<StaticCommandItem>,
  dynamicContentFuse: Fuse<IndexItem>,
  commandIdToItemMap: Map<string, StaticCommandItem>,
  dynamicIdToItemMap: Map<string, IndexItem>,
  showRecentFirst: boolean,
): Promise<CombinedResult[]> {
  // Perform search on static commands and dynamic items
  const commandResults = searchCommands(commandsFuse, query, commandIdToItemMap);
  const dynamicResults = searchDynamicItems(
    dynamicContentFuse,
    query,
    dynamicIdToItemMap,
    10,
    showRecentFirst,
  );

  // Perform vector search in parallel for semantic results
  let vectorResults: VectorSearchResult[] = [];
  try {
    vectorResults = await searchVectors(query, 10); // Get vector search results
  } catch (e) {}

  // Create a map to avoid duplicate results and merge different sources
  const resultMap = new Map<string, CombinedResult>();

  // Add command results to resultMap
  commandResults.forEach((r) => resultMap.set(r.id, r));

  // Add dynamic results and merge with vector results if necessary
  const seenIds = new Set<string>(); // Track seen IDs to prevent duplicates
  dynamicResults.forEach((r) => {
    seenIds.add(r.id);
    const vectorMatch = vectorResults.find((v) => v.object.id === r.id); // Check for vector match
    if (vectorMatch) {
      // If both Fuse and vector match, combine their scores
      resultMap.set(r.id, {
        ...r,
        score: r.score + vectorMatch.similarity * 0.6, // Boost match score
      });
    } else {
      // If only Fuse match, keep original score
      resultMap.set(r.id, r);
    }
  });

  // Add vector results not already added
  vectorResults.forEach((v) => {
    const id = v.object.id;
    if (!seenIds.has(id)) {
      // If vector result is not in Fuse results, add it
      resultMap.set(id, {
        id,
        type: "dynamic" as const,
        score: v.similarity * 0.9, // Use vector similarity as score
        item: v.object,
      });
    }
  });

  // Convert resultMap to array and sort by score
  const results = Array.from(resultMap.values());
  results.sort((a, b) => b.score - a.score); // Sort results by score in descending order

  return results; // Return sorted search results
}
