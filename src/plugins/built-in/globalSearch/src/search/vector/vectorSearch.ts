import { EmbeddingIndex, getEmbedding, initializeModel } from "embeddia";
import type { IndexItem } from "../../indexing/types";
import type { SearchResult } from "embeddia";
import { isVectorSearchSupported } from "../../utils/browserDetection";
import { ensureTransformersEnv } from "@/lib/transformersExtension";
import { verboseDebug } from "@/utils/verboseLog";

let vectorIndex: EmbeddingIndex | null = null;
let initializationAttempted = false;
let initializationFailed = false;

export async function initVectorSearch() {
  if (initializationFailed || !isVectorSearchSupported()) {
    if (!isVectorSearchSupported()) {
      verboseDebug("[Vector Search] Vector search not supported in Firefox - using text search only");
    }
    return;
  }

  if (initializationAttempted) return;

  initializationAttempted = true;

  try {
    await ensureTransformersEnv();
    await initializeModel();
    vectorIndex = new EmbeddingIndex([]);
    vectorIndex.preloadIndexedDB();
    verboseDebug("[Vector Search] Initialized successfully");
  } catch (e) {
    console.warn("[Vector Search] Failed to initialize vector search (will use text search only):", e);
    initializationFailed = true;
    vectorIndex = null;
  }
}

export interface VectorSearchResult extends SearchResult {
  object: IndexItem & { embedding: number[] };
}

const embeddingCache = new Map<string, number[]>();
const MAX_EMBEDDING_CACHE_SIZE = 50;

function setCachedEmbedding(query: string, embedding: number[]) {
  if (embeddingCache.size >= MAX_EMBEDDING_CACHE_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey !== undefined) embeddingCache.delete(firstKey);
  }
  embeddingCache.set(query, embedding);
}

export function clearEmbeddingCache(): void {
  embeddingCache.clear();
  verboseDebug("[Vector Search] Embedding cache cleared");
}

if (typeof window !== "undefined") {
  window.addEventListener("betterseqta-clear-embedding-cache", clearEmbeddingCache);
}

export async function searchVectors(
  query: string,
  topK: number = 20,
): Promise<VectorSearchResult[]> {
  if (!isVectorSearchSupported() || initializationFailed) return [];

  if (!vectorIndex) {
    await initVectorSearch();
    if (!vectorIndex) return [];
  }

  const normalizedQuery = query.trim().toLowerCase().slice(0, 100);
  let queryEmbedding = embeddingCache.get(normalizedQuery);

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
      topK: Math.min(topK * 2, 30),
      useStorage: "indexedDB",
      dedupeEntries: true,
    });

    return results
      .filter((r) => r.similarity > 0.80)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK) as VectorSearchResult[];
  } catch (e) {
    console.warn("[Vector Search] Search failed:", e);
    return [];
  }
}

export async function refreshVectorCache() {
  if (!isVectorSearchSupported() || initializationFailed) return;

  if (!vectorIndex) await initVectorSearch();

  if (vectorIndex) {
    try {
      vectorIndex.clearIndexedDBCache();
      vectorIndex.preloadIndexedDB();
    } catch (e) {
      console.warn("[Vector Search] Failed to refresh cache:", e);
    }
  }
}
