import { describe, it, expect } from 'vitest';
import { RATE_LIMITS, getRateLimitCategory, buildRateLimitKey } from '@/lib/rate-limit/rates';

describe('RATE_LIMITS', () => {
  it('defines all 6 rate limit categories', () => {
    expect(Object.keys(RATE_LIMITS)).toEqual([
      'auth', 'search', 'invites', 'mutations', 'command', 'default',
    ]);
  });

  it('each config has maxTokens, refillRate, and refillInterval', () => {
    for (const [key, config] of Object.entries(RATE_LIMITS)) {
      expect(config).toHaveProperty('maxTokens');
      expect(config).toHaveProperty('refillRate');
      expect(config).toHaveProperty('refillInterval');
      expect(typeof config.maxTokens).toBe('number');
      expect(typeof config.refillRate).toBe('number');
      expect(typeof config.refillInterval).toBe('number');
    }
  });
});

describe('getRateLimitCategory', () => {
  it('returns invites for /api/invites paths', () => {
    expect(getRateLimitCategory('/api/invites')).toBe('invites');
    expect(getRateLimitCategory('/api/invites/create')).toBe('invites');
  });

  it('returns search for /api/search paths', () => {
    expect(getRateLimitCategory('/api/search')).toBe('search');
    expect(getRateLimitCategory('/api/search/quests')).toBe('search');
  });

  it('returns mutations for /api/actions, /api/milestones, /api/quests', () => {
    expect(getRateLimitCategory('/api/actions')).toBe('mutations');
    expect(getRateLimitCategory('/api/milestones')).toBe('mutations');
    expect(getRateLimitCategory('/api/quests')).toBe('mutations');
    expect(getRateLimitCategory('/api/quests/abc/actions')).toBe('mutations');
  });

  it('returns command for /api/commands and /api/command', () => {
    expect(getRateLimitCategory('/api/commands')).toBe('command');
    expect(getRateLimitCategory('/api/command')).toBe('command');
  });

  it('returns auth for /api/auth, /sign-in, /sign-up', () => {
    expect(getRateLimitCategory('/api/auth')).toBe('auth');
    expect(getRateLimitCategory('/sign-in')).toBe('auth');
    expect(getRateLimitCategory('/sign-up')).toBe('auth');
    expect(getRateLimitCategory('/sign-in/refresh')).toBe('auth');
  });

  it('returns default for unknown paths', () => {
    expect(getRateLimitCategory('/')).toBe('default');
    expect(getRateLimitCategory('/api/unknown')).toBe('default');
    expect(getRateLimitCategory('/static/file.js')).toBe('default');
  });
});

describe('buildRateLimitKey', () => {
  it('combines identifier and category with colon', () => {
    expect(buildRateLimitKey('ip:127.0.0.1', 'auth')).toBe('ip:127.0.0.1:auth');
  });
});
