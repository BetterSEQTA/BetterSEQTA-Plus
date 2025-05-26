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

export async function searchVectors(
  query: string,
  topK: number = 20,
): Promise<VectorSearchResult[]> {
  if (!vectorIndex) await initVectorSearch();

  const queryEmbedding = await getEmbedding(query.slice(0, 100));

  const results = await vectorIndex!.search(queryEmbedding, {
    topK,
    useStorage: "indexedDB",
    dedupeEntries: true,
  });

  // filter results with a similarity below 0.81
  const filteredResults = results.filter((r) => r.similarity > 0.81);

  return filteredResults as VectorSearchResult[];
}

export async function refreshVectorCache() {
  if (!vectorIndex) await initVectorSearch();
  vectorIndex!.clearIndexedDBCache();
  vectorIndex!.preloadIndexedDB();
}
