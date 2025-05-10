// Import types for command and indexing items
import type { StaticCommandItem } from "./commands";
import type { IndexItem } from "../indexing/types";

// Interface to define the structure of matched indices
export interface MatchIndices {
  readonly 0: number; // Start index of the match
  readonly 1: number; // End index of the match
}

// Interface for a single match in a Fuse search result
export interface FuseResultMatch {
  key?: string; // Optional key for the matched item
  value?: string; // Optional value for the matched item
  indices: readonly MatchIndices[]; // Array of match indices
}

// Interface to define a combined result for commands or dynamic items
export interface CombinedResult {
  id: string; // Unique identifier for the item
  type: "command" | "dynamic"; // Type of the item (command or dynamic)
  score: number; // Score of the match
  item: StaticCommandItem | IndexItem; // The matched item (command or indexed item)
  matches?: readonly FuseResultMatch[]; // Optional matches found in the item
}

// Interface for Fuse search result structure
export interface FuseResult<T> {
  item: T; // The item being searched for
  refIndex: number; // Index reference of the result
  score?: number; // Optional score indicating the match quality
  matches?: readonly FuseResultMatch[]; // Optional matches found in the item
}
