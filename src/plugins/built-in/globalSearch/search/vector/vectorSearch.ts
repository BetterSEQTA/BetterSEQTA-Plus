/* import type { VectorSearchResult } from "./vectorTypes";
import { VectorWorkerManager } from '../../indexing/worker/vectorWorkerManager';

export function searchVectors(query: string, topK: number = 10): Promise<VectorSearchResult[]> {
  // Use the single instance of the VectorWorkerManager (from indexing) to perform the search
  return VectorWorkerManager.getInstance().search(query, topK);
}
 */

import { EmbeddingIndex, getEmbedding, initializeModel } from 'client-vector-search';
import type { HydratedIndexItem } from '../../indexing/types';
import type { SearchResult } from 'client-vector-search';

let vectorIndex: EmbeddingIndex | null = null;

export async function initVectorSearch() {
  try {
    await initializeModel();
    vectorIndex = new EmbeddingIndex([]);
    vectorIndex.preloadIndexedDB();
  } catch (e) {
    console.error('Error initializing vector search', e);
  }
}

export interface VectorSearchResult extends SearchResult {
  object: HydratedIndexItem & { embedding: number[] };
}

export async function searchVectors(query: string, topK: number = 10): Promise<VectorSearchResult[]> {
  if (!vectorIndex) await initVectorSearch();
  
  const queryEmbedding = await getEmbedding(query.slice(0, 100));

  const results = await vectorIndex!.search(queryEmbedding, { 
    topK,
    useStorage: 'indexedDB',
    dedupeEntries: true
  });
  
  return results as VectorSearchResult[];
}