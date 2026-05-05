import type { IndexItem } from "../indexing/types";
import type { CombinedResult } from "../core/types";
import { searchVectors, type VectorSearchResult } from "./vector/vectorSearch";
import { jobs } from "../indexing/jobs";

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
 * Normalizes a score to 0-1 range
 */
function normalizeScore(score: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (score - min) / (max - min)));
}

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
 * Calculates popularity boost (can be extended with click tracking, etc.)
 */
function calculatePopularityBoost(item: IndexItem): number {
  // For now, boost based on category and metadata
  let boost = 0;
  
  // Boost assignments/assessments
  if (item.category === "assignments") {
    boost += 0.1;
  }
  
  // Boost upcoming items
  if (item.metadata?.isUpcoming) {
    boost += 0.15;
  }
  
  // Boost items with subject codes (more structured)
  if (item.metadata?.subjectCode) {
    boost += 0.05;
  }
  
  return Math.min(boost, 0.3); // Cap at 0.3
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
  
  // Get vector search results for reranking
  // We'll search the full index and then filter to our BM25 results
  let vectorResults: VectorSearchResult[] = [];
  
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
      
      const rerankedResults = topBm25Results.map(result => {
        const item = result.item;
        
        // Normalize BM25 score to 0-1
        // Fuse.js scores: lower is better (0 = perfect match)
        // We need to invert: higher score = better match
        // Result.score is typically 0-100, where higher = better
        // So we normalize it to 0-1
        const normalizedBm25Score = Math.max(0, Math.min(1, result.score / 100));
        
        // Get vector similarity (0-1, already normalized)
        // If item wasn't in vector results, use a default low score
        const vectorSimilarity = vectorMap.get(item.id) || 0.3; // Default to 0.3 if not found
        
        // Calculate recency boost (0-1 range)
        const recencyBoost = opts.recencyBoost 
          ? calculateRecencyBoost(item, now) * opts.recencyWeight
          : 0;
        
        // Calculate popularity boost (0-1 range)
        const popularityBoost = calculatePopularityBoost(item);
        
        // Apply job-specific boost if available
        const job = jobs[item.category];
        let jobBoost = 0;
        if (job && typeof job.boostCriteria === 'function') {
          const boost = job.boostCriteria(item, trimmedQuery);
          if (boost) {
            jobBoost = boost / 100; // Normalize boost to 0-1
          }
        }
        
        // Combine scores using weighted average
        // BM25 and vector are weighted, boosts are additive
        const hybridScore = 
          (normalizedBm25Score * opts.bm25Weight) +
          (vectorSimilarity * opts.vectorWeight) +
          recencyBoost +
          popularityBoost +
          jobBoost;
        
        return {
          ...result,
          score: hybridScore * 100, // Scale back to 0-100 for consistency
          // Store component scores for debugging (optional, can be removed in production)
          _hybridScores: {
            bm25: normalizedBm25Score,
            vector: vectorSimilarity,
            recency: recencyBoost,
            popularity: popularityBoost,
            jobBoost: jobBoost,
            final: hybridScore,
          },
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
  allItems: IndexItem[],
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
  
  vectorResults.forEach(v => {
    if (!bm25Ids.has(v.object.id)) {
      // This is a semantic match that BM25 missed
      const item = v.object;
      
      // Calculate boosts
      const recencyBoost = opts.recencyBoost 
        ? calculateRecencyBoost(item, now) * opts.recencyWeight
        : 0;
      const popularityBoost = calculatePopularityBoost(item);
      
      // Vector-only results get lower base score but high vector similarity
      const vectorScore = v.similarity * opts.vectorWeight + recencyBoost + popularityBoost;
      
      // Apply job-specific boost if available
      const job = jobs[item.category];
      let jobBoost = 0;
      if (job && typeof job.boostCriteria === 'function') {
        const boost = job.boostCriteria(item, trimmedQuery);
        if (boost) {
          jobBoost = boost / 100; // Normalize boost
        }
      }
      
      vectorOnlyResults.push({
        id: item.id,
        type: "dynamic" as const,
        score: (vectorScore + jobBoost) * 100,
        item,
        _hybridScores: {
          bm25: 0,
          vector: v.similarity,
          recency: recencyBoost,
          popularity: popularityBoost,
          final: vectorScore + jobBoost,
        },
      });
    }
  });
  
  // Combine reranked BM25 results with vector-only results
  const allResults = [...rerankedBm25, ...vectorOnlyResults];
  
  // Sort by score and return top results
  allResults.sort((a, b) => b.score - a.score);
  
  return allResults.slice(0, opts.finalLimit);
}

