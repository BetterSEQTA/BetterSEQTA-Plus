import type { SearchResult } from "embeddia";
import type { HydratedIndexItem } from "../../indexing/types";

export interface VectorSearchResult extends SearchResult {
  object: HydratedIndexItem & { embedding: number[] };
}
  