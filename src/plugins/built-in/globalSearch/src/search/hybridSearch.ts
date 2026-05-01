import type { IndexItem } from "../indexing/types";
import type { CombinedResult } from "../core/types";
import { searchVectors, type VectorSearchResult } from "./vector/vectorSearch";
import { jobs } from "../indexing/jobs";
import {
  getLexicalMatchQuality,
  isStrongLexicalMatch,
  STRONG_LEXICAL_THRESHOLD,
} from "./lexicalMatch";

function isIndexItem(item: CombinedResult["item"]): item is IndexItem {
  return (item as IndexItem).dateAdded !== undefined;
}

/**
 * Heuristic for "this query is still too short / too sparse for vector
 * recall to be reliable". When true we should not promote vector-only
 * results above lexical ones.
 *
 * Note: this is intentionally distinct from the absolute >2 character cut-off
 * used for `hybridSearch`. Vector recall on 3-7 character single-token
 * queries is noisy enough that we should keep lexical results dominant.
 */
function isWeakSemanticQuery(trimmedQuery: string): boolean {
  if (trimmedQuery.length < 8) return true;
  const meaningfulTokens = trimmedQuery
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  return meaningfulTokens.length < 2;
}

/**
 * Hybrid Search Implementation
 * 
 * Flow:
 * 1. BM25 (Fuse.js) gets top N results fast
 * 2. Vector search reranks by semantic similarity
 * 3. Apply optional boosting (recency, popularity, tags)
 */

export interface HybridSearchOptions {
  /** Maximum number of BM25 results to retrieve before reranking */
  bm25TopK?: number;
  /** Maximum number of final results to return */
  finalLimit?: number;
  /** Whether to apply recency boost */
  recencyBoost?: boolean;
  /** Weight for BM25 scores (0-1) */
  bm25Weight?: number;
  /** Weight for vector similarity scores (0-1) */
  vectorWeight?: number;
  /** Weight for recency boost */
  recencyWeight?: number;
}

const DEFAULT_OPTIONS: Required<HybridSearchOptions> = {
  bm25TopK: 50, // Get top 50 from BM25, then rerank
  finalLimit: 10,
  recencyBoost: true,
  bm25Weight: 0.4, // 40% BM25, 60% vector
  vectorWeight: 0.6,
  recencyWeight: 0.1,
};

/**
 * Calculates recency boost based on item age
 */
function calculateRecencyBoost(item: IndexItem, now: number): number {
  const ageInDays = (now - item.dateAdded) / (1000 * 60 * 60 * 24);
  // Exponential decay: newer items get higher boost
  // Items from today get boost of 1, items from 30 days ago get ~0.03
  return 1 / (1 + ageInDays / 7); // Half-life of 7 days
}

/**
 * Category-aware popularity / structure boost.
 *
 * High-confidence curated content (assignments, courses, subjects, forums)
 * sits above noisier sources (notices, documents) which sit above the
 * passive store. This keeps the most actionable hits at the top while
 * still surfacing wide-recall semantic matches when relevant.
 */
function calculatePopularityBoost(item: IndexItem): number {
  let boost = 0;

  switch (item.category) {
    case "assignments":
      boost += 0.12;
      break;
    case "subjects":
    case "courses":
      boost += 0.08;
      break;
    case "forums":
    case "messages":
      boost += 0.06;
      break;
    case "notices":
    case "folio":
    case "reports":
    case "goals":
      boost += 0.04;
      break;
    case "documents":
      boost += 0.03;
      break;
    case "portals":
      boost += 0.02;
      break;
    case "passive":
      boost -= 0.1;
      break;
    case "messages-support":
      boost -= 0.18;
      break;
  }

  if (item.metadata?.isUpcoming) boost += 0.12;
  if (item.metadata?.subjectCode) boost += 0.04;
  if (item.metadata?.entityType === "course") boost += 0.02;
  if (item.metadata?.source === "passive") boost -= 0.08;
  if (item.metadata?.supportRecord) boost -= 0.12;
  if (item.metadata?.priority === "low") boost -= 0.05;

  return Math.max(-0.2, Math.min(boost, 0.3));
}

/**
 * Reranks BM25 results using vector search
 */
export async function hybridSearch(
  bm25Results: CombinedResult[],
  query: string,
  options: HybridSearchOptions = {},
): Promise<CombinedResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const trimmedQuery = query.trim().toLowerCase();
  
  // If no BM25 results, return empty
  if (bm25Results.length === 0) {
    return [];
  }
  
  // Limit BM25 results to top K
  const topBm25Results = bm25Results.slice(0, opts.bm25TopK);

  if (trimmedQuery.length > 2) {
    try {
      // Get more vector results than BM25 results to ensure coverage
      // This allows us to find semantic matches that BM25 might have missed
      const vectorSearchResults = await searchVectors(trimmedQuery, opts.bm25TopK * 2);
      
      // Create a map of item ID to vector similarity
      const vectorMap = new Map<string, number>();
      vectorSearchResults.forEach(v => {
        // Use the highest similarity if item appears multiple times
        const existing = vectorMap.get(v.object.id);
        if (!existing || v.similarity > existing) {
          vectorMap.set(v.object.id, v.similarity);
        }
      });
      
      // Now rerank BM25 results with vector scores
      const now = Date.now();
      
      const rerankedResults: CombinedResult[] = topBm25Results.map(result => {
        const item = result.item;

        // Static command items don't have dateAdded/metadata/category to score
        // against — pass them through untouched so palette commands still
        // surface correctly.
        if (!isIndexItem(item)) {
          return result;
        }

        // Normalize BM25 score to 0-1.
        // Result.score is typically 0-100, where higher = better, so we
        // clamp into the 0..1 range.
        const normalizedBm25Score = Math.max(0, Math.min(1, result.score / 100));

        // Get vector similarity (0-1, already normalized). If item wasn't in
        // vector results, use a default mid-low score.
        const vectorSimilarity = vectorMap.get(item.id) || 0.3;

        const recencyBoost = opts.recencyBoost
          ? calculateRecencyBoost(item, now) * opts.recencyWeight
          : 0;

        const popularityBoost = calculatePopularityBoost(item);

        const job = jobs[item.category];
        let jobBoost = 0;
        if (job && typeof job.boostCriteria === 'function') {
          const boost = job.boostCriteria(item, trimmedQuery);
          if (boost) {
            jobBoost = boost / 100;
          }
        }

        // Lexical guardrail: title matches must outweigh fuzzy vector/content
        // overlap so exact titles lead the list.
        const lexicalQuality = getLexicalMatchQuality(item, trimmedQuery);
        let lexicalBonus = lexicalQuality > 0 ? lexicalQuality / 80 : 0;
        if (lexicalQuality >= 12) lexicalBonus += 0.42;
        else if (lexicalQuality >= 10) lexicalBonus += 0.24;
        else if (lexicalQuality >= 8) lexicalBonus += 0.14;

        const hybridScore =
          (normalizedBm25Score * opts.bm25Weight) +
          (vectorSimilarity * opts.vectorWeight) +
          recencyBoost +
          popularityBoost +
          jobBoost +
          lexicalBonus;

        return {
          ...result,
          score: hybridScore * 100,
        };
      });
      
      // Sort by hybrid score descending
      rerankedResults.sort((a, b) => b.score - a.score);
      
      // Return top results
      return rerankedResults.slice(0, opts.finalLimit);
      
    } catch (e) {
      console.warn("[Hybrid Search] Vector reranking failed, using BM25 only:", e);
      // Fallback to BM25 only
      return topBm25Results.slice(0, opts.finalLimit);
    }
  }
  
  // If query is too short for vector search, just return BM25 results
  return topBm25Results.slice(0, opts.finalLimit);
}

/**
 * Enhanced hybrid search that also includes vector-only results not found by BM25
 */
export async function hybridSearchWithExpansion(
  bm25Results: CombinedResult[],
  query: string,
  _allItems: IndexItem[],
  options: HybridSearchOptions = {},
): Promise<CombinedResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const trimmedQuery = query.trim().toLowerCase();

  // First, rerank BM25 results
  const rerankedBm25 = await hybridSearch(bm25Results, query, options);

  // If query is too short, skip vector expansion
  if (trimmedQuery.length <= 2) {
    return rerankedBm25;
  }

  // For short / single-token queries vector expansion brings in too much
  // noise (and is the main reason results "flicker" between adjacent
  // keystrokes). Keep semantic recall for longer queries.
  if (isWeakSemanticQuery(trimmedQuery)) {
    return rerankedBm25.slice(0, opts.finalLimit);
  }

  // Get vector search results
  let vectorResults: VectorSearchResult[] = [];
  try {
    vectorResults = await searchVectors(trimmedQuery, opts.bm25TopK);
  } catch (e) {
    console.warn("[Hybrid Search] Vector search failed:", e);
    return rerankedBm25;
  }

  // Find vector results that weren't in BM25 results
  const bm25Ids = new Set(bm25Results.map(r => r.item.id));
  const vectorOnlyResults: CombinedResult[] = [];

  const now = Date.now();

  // Compute the floor at which a vector-only result is allowed to enter the
  // ranking. Strong lexical matches in the BM25 list set this floor — a
  // vector-only result must beat the lowest strong lexical match's score by
  // a margin to displace it.
  let strongLexicalFloor = -Infinity;
  for (const r of rerankedBm25) {
    if (isIndexItem(r.item) && isStrongLexicalMatch(r.item, trimmedQuery)) {
      if (r.score > strongLexicalFloor) {
        strongLexicalFloor = r.score;
      }
    }
  }
  // Vector-only results may sit at most at this score:
  const vectorOnlyCeiling = strongLexicalFloor === -Infinity
    ? Infinity
    : strongLexicalFloor - 1;

  vectorResults.forEach(v => {
    if (bm25Ids.has(v.object.id)) return;

    // This is a semantic match that BM25 missed
    const item = v.object;

    // Calculate boosts
    const recencyBoost = opts.recencyBoost
      ? calculateRecencyBoost(item, now) * opts.recencyWeight
      : 0;
    const popularityBoost = calculatePopularityBoost(item);

    // Penalize vector-only matches that have no lexical content overlap.
    // Vector recall on its own is fuzzy — without lexical confirmation we
    // should rank these below curated keyword hits.
    const lexicalQuality = getLexicalMatchQuality(item, trimmedQuery);
    let vectorOnlyPenalty = 0;
    if (lexicalQuality === 0) {
      vectorOnlyPenalty -= 0.18;
    }

    // Passive captures without lexical confirmation are demoted further —
    // they're often raw API records that should never lead the result list.
    if (item.category === "passive" && lexicalQuality < STRONG_LEXICAL_THRESHOLD) {
      vectorOnlyPenalty -= 0.12;
    }

    // Vector-only results get lower base score but high vector similarity
    const vectorScore =
      v.similarity * opts.vectorWeight + recencyBoost + popularityBoost + vectorOnlyPenalty;

    // Apply job-specific boost if available
    const job = jobs[item.category];
    let jobBoost = 0;
    if (job && typeof job.boostCriteria === 'function') {
      const boost = job.boostCriteria(item, trimmedQuery);
      if (boost) {
        jobBoost = boost / 100; // Normalize boost
      }
    }

    let finalScore = (vectorScore + jobBoost) * 100;
    if (finalScore > vectorOnlyCeiling) finalScore = vectorOnlyCeiling;

    vectorOnlyResults.push({
      id: item.id,
      type: "dynamic" as const,
      score: finalScore,
      item,
    });
  });

  // Combine reranked BM25 results with vector-only results
  const allResults = [...rerankedBm25, ...vectorOnlyResults];

  // Sort by score and return top results
  allResults.sort((a, b) => b.score - a.score);

  return allResults.slice(0, opts.finalLimit);
}

