import type { SearchResult } from "client-vector-search";
import type { HydratedIndexItem } from "../../indexing/types";

export interface VectorSearchResult extends SearchResult {
  object: HydratedIndexItem & { embedding: number[] };
}
  