import type { SearchResult } from "embeddia";
import type { IndexItem } from "../../indexing/types";

export interface VectorSearchResult extends SearchResult {
  object: IndexItem & { embedding: number[] };
}
