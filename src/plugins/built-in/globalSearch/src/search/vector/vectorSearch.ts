import { EmbeddingIndex, getEmbedding, initializeModel } from "embeddia";
import type { IndexItem } from "../../indexing/types";
import type { SearchResult } from "embeddia";

let vectorIndex: EmbeddingIndex | null = null;

export async function initVectorSearch() {
  try {
    await initializeModel();
    vectorIndex = new EmbeddingIndex([]);
    vectorIndex.preloadIndexedDB();
  } catch (e) {
    console.error("Error initializing vector search", e);
  }
}

export interface VectorSearchResult extends SearchResult {
  object: IndexItem & { embedding: number[] };
}

// Cache for query embeddings to avoid recomputing
const embeddingCache = new Map<string, number[]>();
const EMBEDDING_CACHE_TTL = 1000 * 60 * 30; // 30 minutes
const MAX_EMBEDDING_CACHE_SIZE = 50;

function getCachedEmbedding(query: string): number[] | null {
  const cached = embeddingCache.get(query);
  if (cached) {
    return cached;
  }
  return null;
}

function setCachedEmbedding(query: string, embedding: number[]) {
  // Limit cache size
  if (embeddingCache.size >= MAX_EMBEDDING_CACHE_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }
  embeddingCache.set(query, embedding);
}

export async function searchVectors(
  query: string,
  topK: number = 20,
): Promise<VectorSearchResult[]> {
  if (!vectorIndex) await initVectorSearch();

  // Normalize query for caching
  const normalizedQuery = query.trim().toLowerCase().slice(0, 100);
  
  // Check cache first
  let queryEmbedding = getCachedEmbedding(normalizedQuery);
  
  if (!queryEmbedding) {
    try {
      queryEmbedding = await getEmbedding(normalizedQuery);
      setCachedEmbedding(normalizedQuery, queryEmbedding);
    } catch (e) {
      console.warn("[Vector Search] Failed to get embedding:", e);
      return [];
    }
  }

  try {
    const results = await vectorIndex!.search(queryEmbedding, {
      topK: Math.min(topK * 2, 30), // Get more results, filter later
      useStorage: "indexedDB",
      dedupeEntries: true,
    });

    // Filter results with a similarity below 0.80 (slightly more permissive)
    // and sort by similarity descending
    const filteredResults = results
      .filter((r) => r.similarity > 0.80)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return filteredResults as VectorSearchResult[];
  } catch (e) {
    console.warn("[Vector Search] Search failed:", e);
    return [];
  }
}

export async function refreshVectorCache() {
  if (!vectorIndex) await initVectorSearch();
  vectorIndex!.clearIndexedDBCache();
  vectorIndex!.preloadIndexedDB();
}
