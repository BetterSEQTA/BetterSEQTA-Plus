import type { StaticCommandItem } from './commands';
import type { DynamicContentItem } from './dynamicSearch';

export interface MatchIndices {
  readonly 0: number;
  readonly 1: number;
}

export interface FuseResultMatch {
  key?: string;
  value?: string;
  indices: readonly MatchIndices[];
}

export interface CombinedResult {
  id: string;
  type: 'command' | 'dynamic';
  score: number;
  item: StaticCommandItem | DynamicContentItem;
  matches?: readonly FuseResultMatch[];
}

export interface FuseResult<T> {
  item: T;
  refIndex: number;
  score?: number;
  matches?: readonly FuseResultMatch[];
} 