import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenBucket, RateLimiter } from '@/lib/rate-limit/tokenBucket';

describe('TokenBucket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with max tokens', () => {
    const bucket = new TokenBucket(10, 1, 1000);
    expect(bucket.remaining).toBe(10);
  });

  it('consumes a token on tryConsume', () => {
    const bucket = new TokenBucket(10, 1, 1000);
    expect(bucket.tryConsume()).toBe(true);
    expect(bucket.remaining).toBe(9);
  });

  it('returns false when no tokens remain', () => {
    const bucket = new TokenBucket(1, 1, 1000);
    expect(bucket.tryConsume()).toBe(true);
    expect(bucket.tryConsume()).toBe(false);
    expect(bucket.remaining).toBe(0);
  });

  it('consumes multiple tokens with count parameter', () => {
    const bucket = new TokenBucket(10, 1, 1000);
    expect(bucket.tryConsume(3)).toBe(true);
    expect(bucket.remaining).toBe(7);
  });

  it('returns false when count exceeds available tokens', () => {
    const bucket = new TokenBucket(2, 1, 1000);
    expect(bucket.tryConsume(3)).toBe(false);
    expect(bucket.remaining).toBe(2);
  });

  it('refills tokens after refillInterval elapses', () => {
    const bucket = new TokenBucket(10, 5, 1000);
    bucket.tryConsume(5);
    expect(bucket.remaining).toBe(5);

    vi.advanceTimersByTime(1000);
    expect(bucket.remaining).toBe(10);
  });

  it('refills partially when not enough time for full interval', () => {
    const bucket = new TokenBucket(10, 5, 1000);
    bucket.tryConsume(8);
    expect(bucket.remaining).toBe(2);

    vi.advanceTimersByTime(500);
    expect(bucket.remaining).toBe(2);
  });

  it('accumulates multiple refill intervals', () => {
    const bucket = new TokenBucket(10, 3, 1000);
    bucket.tryConsume(10);
    expect(bucket.remaining).toBe(0);

    vi.advanceTimersByTime(3000);
    expect(bucket.remaining).toBe(9);
  });

  it('caps tokens at maxTokens after refill', () => {
    const bucket = new TokenBucket(10, 20, 1000);
    bucket.tryConsume(1);
    expect(bucket.remaining).toBe(9);

    vi.advanceTimersByTime(2000);
    expect(bucket.remaining).toBe(10);
  });

  it('returns 0 for ttl when tokens available', () => {
    const bucket = new TokenBucket(10, 1, 1000);
    expect(bucket.ttl).toBe(0);
  });

  it('returns positive ttl when empty', () => {
    const bucket = new TokenBucket(5, 1, 1000);
    bucket.tryConsume(5);
    expect(bucket.ttl).toBeGreaterThan(0);
  });

  it('marks stale after 15 minutes of inactivity', () => {
    const bucket = new TokenBucket(10, 1, 1000);
    expect(bucket.stale).toBe(false);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(bucket.stale).toBe(true);
  });

  it('is not stale before 15 minutes', () => {
    const bucket = new TokenBucket(10, 1, 1000);
    vi.advanceTimersByTime(14 * 60 * 1000);
    expect(bucket.stale).toBe(false);
  });

  it('updates lastAccessed on tryConsume', () => {
    const bucket = new TokenBucket(10, 1, 1000);
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(bucket.stale).toBe(true);

    bucket.tryConsume();
    expect(bucket.stale).toBe(false);
  });
});

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within limit', () => {
    const limiter = new RateLimiter();
    expect(limiter.check('ip:1', 5, 1, 1000)).toBe(true);
    expect(limiter.remaining('ip:1')).toBe(4);
  });

  it('blocks requests exceeding limit', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 3; i++) {
      limiter.check('ip:1', 3, 1, 1000);
    }
    expect(limiter.check('ip:1', 3, 1, 1000)).toBe(false);
    expect(limiter.remaining('ip:1')).toBe(0);
  });

  it('isolates buckets by key', () => {
    const limiter = new RateLimiter();
    expect(limiter.check('user:1', 3, 1, 1000)).toBe(true);
    expect(limiter.check('user:1', 3, 1, 1000)).toBe(true);
    expect(limiter.check('user:2', 3, 1, 1000)).toBe(true);
    expect(limiter.check('user:2', 3, 1, 1000)).toBe(true);
    expect(limiter.remaining('user:1')).toBe(1);
    expect(limiter.remaining('user:2')).toBe(1);
  });

  it('returns 0 for remaining on unknown key', () => {
    const limiter = new RateLimiter();
    expect(limiter.remaining('unknown')).toBe(0);
  });

  it('returns 0 for ttl on unknown key', () => {
    const limiter = new RateLimiter();
    expect(limiter.ttl('unknown')).toBe(0);
  });

  it('returns positive ttl when exhausted', () => {
    const limiter = new RateLimiter();
    limiter.check('ip:1', 1, 1, 1000);
    limiter.check('ip:1', 1, 1, 1000);
    expect(limiter.ttl('ip:1')).toBeGreaterThan(0);
  });

  it('cleans up stale buckets', () => {
    const limiter = new RateLimiter(60 * 1000);
    limiter.check('stale-key', 5, 1, 1000);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    vi.advanceTimersByTime(60 * 1000);

    expect(limiter.remaining('stale-key')).toBe(0);
  });

  it('dispose clears all buckets and timer', () => {
    const limiter = new RateLimiter();
    limiter.check('key1', 5, 1, 1000);
    limiter.check('key2', 5, 1, 1000);
    limiter.dispose();

    expect(limiter.remaining('key1')).toBe(0);
    expect(limiter.remaining('key2')).toBe(0);
  });

  it('handles SSR safely', () => {
    const origSetInterval = globalThis.setInterval;
    (globalThis as any).setInterval = undefined;

    const limiter = new RateLimiter();
    expect(limiter.check('key', 5, 1, 1000)).toBe(true);
    expect(limiter.remaining('key')).toBe(4);

    (globalThis as any).setInterval = origSetInterval;
  });
});
