import { EmbeddingIndex, getEmbedding, initializeModel } from "embeddia";
import type { IndexItem } from "../../indexing/types";
import type { SearchResult } from "embeddia";
import { isVectorSearchSupported } from "../../utils/browserDetection";

let vectorIndex: EmbeddingIndex | null = null;
let initializationAttempted = false;
let initializationFailed = false;

export async function initVectorSearch() {
  // Skip initialization if already attempted and failed, or if not supported
  if (initializationFailed || !isVectorSearchSupported()) {
    if (!isVectorSearchSupported()) {
      console.debug("[Vector Search] Vector search not supported in Firefox - using text search only");
    }
    return;
  }

  if (initializationAttempted) {
    return;
  }

  initializationAttempted = true;

  try {
    await initializeModel();
    vectorIndex = new EmbeddingIndex([]);
    vectorIndex.preloadIndexedDB();
    console.debug("[Vector Search] Initialized successfully");
  } catch (e) {
    console.warn("[Vector Search] Failed to initialize vector search (will use text search only):", e);
    initializationFailed = true;
    vectorIndex = null;
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

/**
 * Clears the embedding cache
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
  console.debug("[Vector Search] Embedding cache cleared");
}

// Listen for cache clear events (e.g., on extension update)
if (typeof window !== 'undefined') {
  window.addEventListener('betterseqta-clear-embedding-cache', () => {
    clearEmbeddingCache();
  });
}

export async function searchVectors(
  query: string,
  topK: number = 20,
): Promise<VectorSearchResult[]> {
  // Return empty array if vector search is not supported or failed to initialize
  if (!isVectorSearchSupported() || initializationFailed) {
    return [];
  }

  if (!vectorIndex) {
    await initVectorSearch();
    if (!vectorIndex) {
      return [];
    }
  }

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
  if (!isVectorSearchSupported() || initializationFailed) {
    return;
  }
  
  if (!vectorIndex) {
    await initVectorSearch();
  }
  
  if (vectorIndex) {
    try {
      vectorIndex.clearIndexedDBCache();
      vectorIndex.preloadIndexedDB();
    } catch (e) {
      console.warn("[Vector Search] Failed to refresh cache:", e);
    }
  }
}
