export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private lastAccessed: number;

  constructor(
    private readonly maxTokens: number,
    private readonly refillRate: number,
    private readonly refillInterval: number,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.lastAccessed = Date.now();
  }

  tryConsume(count = 1): boolean {
    this.refill();
    this.lastAccessed = Date.now();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  get remaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  get ttl(): number {
    if (this.tokens >= 1) return 0;
    const deficit = Math.ceil(1 - this.tokens);
    const waitIntervals = Math.ceil(deficit / this.refillRate);
    return Math.max(1, waitIntervals * this.refillInterval);
  }

  get stale(): boolean {
    return Date.now() - this.lastAccessed > 15 * 60 * 1000;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed < this.refillInterval) return;
    const intervals = Math.floor(elapsed / this.refillInterval);
    const add = intervals * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + add);
    this.lastRefill = now - (elapsed % this.refillInterval);
  }
}

export class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly cleanupIntervalMs = 5 * 60 * 1000,
  ) {
    if (typeof setInterval !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
      if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
        (this.cleanupTimer as NodeJS.Timeout).unref();
      }
    }
  }

  check(
    key: string,
    maxTokens: number,
    refillRate: number,
    refillInterval: number,
  ): boolean {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(maxTokens, refillRate, refillInterval);
      this.buckets.set(key, bucket);
    }
    return bucket.tryConsume(1);
  }

  remaining(key: string): number {
    return this.buckets.get(key)?.remaining ?? 0;
  }

  ttl(key: string): number {
    return this.buckets.get(key)?.ttl ?? 0;
  }

  private cleanup(): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.stale) {
        this.buckets.delete(key);
      }
    }
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.buckets.clear();
  }
}
