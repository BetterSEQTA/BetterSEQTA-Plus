import type { SearchResult } from "embeddia"; // Import the base SearchResult type from the embeddia library
import type { IndexItem } from "../../indexing/types"; // Import the IndexItem type used for indexed objects

// Extend the base SearchResult type to include the associated IndexItem and its embedding
export interface VectorSearchResult extends SearchResult {
  object: IndexItem & { embedding: number[] }; // The matched object with its corresponding embedding vector
}
