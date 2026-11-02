import type { StaticCommandItem } from "./commands";
import type { IndexItem } from "../indexing/types";

export type MatchIndices = readonly [number, number];

export interface FuseResultMatch {
  key?: string;
  value?: string;
  indices: readonly MatchIndices[];
}

export interface CombinedResult {
  id: string;
  type: "command" | "dynamic";
  score: number;
  item: StaticCommandItem | IndexItem;
  matches?: readonly FuseResultMatch[];
}

export interface FuseResult<T> {
  item: T;
  refIndex: number;
  score?: number;
  matches?: readonly FuseResultMatch[];
}
