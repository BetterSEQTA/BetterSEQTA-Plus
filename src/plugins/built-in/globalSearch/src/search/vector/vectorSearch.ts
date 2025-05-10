import { EmbeddingIndex, getEmbedding, initializeModel } from "embeddia"; // Import vector indexing utilities from the embeddia library
import type { IndexItem } from "../../indexing/types"; // Import the IndexItem type used for indexing
import type { SearchResult } from "embeddia"; // Import the base SearchResult type from embeddia

let vectorIndex: EmbeddingIndex | null = null; // Declare a variable to hold the vector index instance

// Initialize the vector search model and preload data from IndexedDB
export async function initVectorSearch() {
  try {
    await initializeModel(); // Load and initialize the embedding model
    vectorIndex = new EmbeddingIndex([]); // Create a new EmbeddingIndex with no initial items
    vectorIndex.preloadIndexedDB(); // Preload any stored vectors from IndexedDB
  } catch (e) {
    console.error("Error initializing vector search", e); // Log initialization errors
  }
}

// Extends the base SearchResult with associated indexed object and its embedding
export interface VectorSearchResult extends SearchResult {
  object: IndexItem & { embedding: number[] }; // The matched index item with its embedding
}

// Perform a vector similarity search using a text query
export async function searchVectors(
  query: string,
  topK: number = 10, // Number of top matches to return
): Promise<VectorSearchResult[]> {
  if (!vectorIndex) await initVectorSearch(); // Ensure the vector index is initialized

  const queryEmbedding = await getEmbedding(query.slice(0, 100)); // Get the embedding for the first 100 characters of the query

  const results = await vectorIndex!.search(queryEmbedding, {
    topK,                        // Limit to topK results
    useStorage: "indexedDB",     // Use IndexedDB as the storage backend
    dedupeEntries: true,         // Remove duplicate entries
  });

  return results as VectorSearchResult[]; // Cast and return results as VectorSearchResult[]
}

// Clear and reload the IndexedDB vector cache
export async function refreshVectorCache() {
  if (!vectorIndex) await initVectorSearch(); // Ensure the vector index is initialized
  vectorIndex!.clearIndexedDBCache(); // Clear the cached vector data
  vectorIndex!.preloadIndexedDB();    // Reload vectors from IndexedDB
}
