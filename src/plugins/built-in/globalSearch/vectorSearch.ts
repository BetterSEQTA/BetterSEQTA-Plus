import { EmbeddingIndex, getEmbedding, initializeModel } from 'client-vector-search';
import type { HydratedIndexItem } from './indexing/types';
import type { SearchResult } from 'client-vector-search';

let vectorIndex: EmbeddingIndex | null = null;

export async function initVectorSearch() {
  try {
    await initializeModel();
    vectorIndex = new EmbeddingIndex([]);
    // Load existing items from IndexedDB
    const stored = await vectorIndex.getAllObjectsFromIndexedDB();
    if (stored.length > 0) {
      stored.forEach(item => vectorIndex!.add(item));
      console.debug('Vector index loaded from IndexedDB');
    }
  } catch (e) {
    console.debug('Creating new vector index');
    vectorIndex = new EmbeddingIndex([]);
  }
}

export async function vectorizeItem(item: HydratedIndexItem): Promise<HydratedIndexItem & { embedding: number[] }> {
  const textToEmbed = [
    item.text,
    item.content,
    item.category,
    item.metadata?.author,
    item.metadata?.subject
  ].filter(Boolean).join(' ');

  const embedding = await getEmbedding(textToEmbed);
  return { ...item, embedding };
}

export async function processItems(items: HydratedIndexItem[]) {
  if (!vectorIndex) await initVectorSearch();
  
  const unprocessedItems = items.filter(item => {
    try {
      return !vectorIndex!.get({ id: item.id });
    } catch {
      return true;
    }
  });

  if (unprocessedItems.length === 0) {
    console.debug('No new items to vectorize');
    return;
  }

  console.debug(`Vectorizing ${unprocessedItems.length} new items...`);
  
  // Process in batches to avoid UI freeze
  const BATCH_SIZE = 5;
  for (let i = 0; i < unprocessedItems.length; i += BATCH_SIZE) {
    const batch = unprocessedItems.slice(i, i + BATCH_SIZE);
    const vectorized = await Promise.all(batch.map(vectorizeItem));
    
    for (const item of vectorized) {
      vectorIndex!.add(item);
    }
    
    // Save periodically to avoid losing progress
    await vectorIndex!.saveIndex('indexedDB');
    
    // Log progress
    console.debug(`Vectorized ${Math.min(i + BATCH_SIZE, unprocessedItems.length)}/${unprocessedItems.length} items`);
  }
}

export interface VectorSearchResult extends SearchResult {
  object: HydratedIndexItem & { embedding: number[] };
}

export async function searchVectors(query: string, topK: number = 10): Promise<VectorSearchResult[]> {
  if (!vectorIndex) await initVectorSearch();
  
  const queryEmbedding = await getEmbedding(query);
  const results = await vectorIndex!.search(queryEmbedding, { 
    topK,
    useStorage: 'indexedDB'
  });
  
  return results as VectorSearchResult[];
}