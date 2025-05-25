import { delay } from "@/seqta/utils/delay";

export interface RateLimiterConfig {
  minDelay: number;           // Minimum delay between requests (ms)
  maxDelay: number;           // Maximum delay between requests (ms)
  baseDelay: number;          // Base delay between requests (ms)
  backoffMultiplier: number;  // Exponential backoff multiplier
  maxRetries: number;         // Maximum retries for failed requests
  adaptiveBatchSize?: boolean; // Enable adaptive batch sizing
  minBatchSize?: number;      // Minimum batch size
  maxBatchSize?: number;      // Maximum batch size
  baseBatchSize?: number;     // Starting batch size
}

export interface RateLimiterState {
  currentDelay: number;
  failedRequests: number;
  lastSuccessTime: number;
  currentBatchSize?: number;
}

export class RateLimiter {
  private config: RateLimiterConfig;
  private state: RateLimiterState;

  constructor(config: RateLimiterConfig, initialState?: Partial<RateLimiterState>) {
    this.config = config;
    this.state = {
      currentDelay: config.baseDelay,
      failedRequests: 0,
      lastSuccessTime: Date.now(),
      currentBatchSize: config.baseBatchSize || 50,
      ...initialState,
    };
  }

  /**
   * Wait for the appropriate delay before making the next request
   */
  async waitForNext(): Promise<void> {
    await delay(this.state.currentDelay);
  }

  /**
   * Record a successful request and adjust delays accordingly
   */
  recordSuccess(responseTime?: number): void {
    this.state.lastSuccessTime = Date.now();
    this.state.failedRequests = Math.max(0, this.state.failedRequests - 1);
    
    if (responseTime !== undefined) {
      this.state.currentDelay = this.calculateAdaptiveDelay(responseTime);
      
      if (this.config.adaptiveBatchSize && this.state.currentBatchSize !== undefined) {
        this.state.currentBatchSize = this.calculateAdaptiveBatchSize(responseTime);
      }
    }
  }

  /**
   * Record a failed request and increase delays
   */
  recordFailure(): void {
    this.state.failedRequests++;
    this.state.currentDelay = Math.min(
      this.state.currentDelay * this.config.backoffMultiplier,
      this.config.maxDelay
    );
    
    if (this.config.adaptiveBatchSize && this.state.currentBatchSize !== undefined) {
      this.state.currentBatchSize = Math.max(
        Math.floor(this.state.currentBatchSize * 0.7),
        this.config.minBatchSize || 10
      );
    }
  }

  /**
   * Execute a request with automatic retry logic
   */
  async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    retryCount = 0
  ): Promise<T | null> {
    try {
      const startTime = Date.now();
      const result = await requestFn();
      const responseTime = Date.now() - startTime;
      
      this.recordSuccess(responseTime);
      return result;
    } catch (error) {
      console.warn(`Request failed (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < this.config.maxRetries) {
        this.recordFailure();
        await this.waitForNext();
        return this.executeWithRetry(requestFn, retryCount + 1);
      }
      
      this.recordFailure();
      return null;
    }
  }

  /**
   * Get current state for persistence
   */
  getState(): RateLimiterState {
    return { ...this.state };
  }

  /**
   * Update state from persisted data
   */
  setState(state: Partial<RateLimiterState>): void {
    this.state = { ...this.state, ...state };
  }

  /**
   * Get current batch size (if adaptive batching is enabled)
   */
  getCurrentBatchSize(): number {
    return this.state.currentBatchSize || this.config.baseBatchSize || 50;
  }

  /**
   * Get current delay
   */
  getCurrentDelay(): number {
    return this.state.currentDelay;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.state.failedRequests;
  }

  private calculateAdaptiveDelay(responseTime: number): number {
    const { currentDelay, failedRequests, lastSuccessTime } = this.state;
    const timeSinceLastSuccess = Date.now() - lastSuccessTime;
    
    // Increase delay if we're seeing failures or slow responses
    if (failedRequests > 0 || responseTime > 2000) {
      return Math.min(currentDelay * this.config.backoffMultiplier, this.config.maxDelay);
    }
    
    // Decrease delay if we're doing well and it's been a while since last success
    if (responseTime < 500 && timeSinceLastSuccess > 10000) {
      return Math.max(currentDelay * 0.8, this.config.minDelay);
    }
    
    return currentDelay;
  }

  private calculateAdaptiveBatchSize(responseTime: number): number {
    if (!this.config.adaptiveBatchSize || this.state.currentBatchSize === undefined) {
      return this.state.currentBatchSize || this.config.baseBatchSize || 50;
    }
    
    const { currentBatchSize, failedRequests } = this.state;
    
    // Reduce batch size if we're seeing failures or slow responses
    if (failedRequests > 2 || responseTime > 3000) {
      return Math.max(
        Math.floor(currentBatchSize * 0.7),
        this.config.minBatchSize || 10
      );
    }
    
    // Increase batch size if we're doing well
    if (failedRequests === 0 && responseTime < 1000) {
      return Math.min(
        Math.floor(currentBatchSize * 1.2),
        this.config.maxBatchSize || 100
      );
    }
    
    return currentBatchSize;
  }
}

/**
 * Predefined rate limiter configurations for different job types
 */
export const RATE_LIMITER_PRESETS = {
  MESSAGES: {
    minDelay: 50,
    maxDelay: 5000,
    baseDelay: 200,
    backoffMultiplier: 1.5,
    maxRetries: 3,
    adaptiveBatchSize: true,
    minBatchSize: 10,
    maxBatchSize: 100,
    baseBatchSize: 50,
  } as RateLimiterConfig,

  NOTIFICATIONS: {
    minDelay: 100,
    maxDelay: 3000,
    baseDelay: 150,
    backoffMultiplier: 1.4,
    maxRetries: 2,
    adaptiveBatchSize: false,
  } as RateLimiterConfig,

  FORUMS: {
    minDelay: 75,
    maxDelay: 2000,
    baseDelay: 100,
    backoffMultiplier: 1.3,
    maxRetries: 2,
    adaptiveBatchSize: true,
    minBatchSize: 5,
    maxBatchSize: 50,
    baseBatchSize: 25,
  } as RateLimiterConfig,

  SUBJECTS: {
    minDelay: 50,
    maxDelay: 1000,
    baseDelay: 75,
    backoffMultiplier: 1.2,
    maxRetries: 1,
    adaptiveBatchSize: false,
  } as RateLimiterConfig,
}; 