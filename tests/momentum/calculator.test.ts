import { describe, it, expect } from 'vitest';
import { calculateMomentum } from '@/features/momentum/calculator';
import type { PillarEvaluation } from '@/features/momentum/types';

function makePillar(score: number, prev?: number): PillarEvaluation {
  return {
    score,
    summary: '',
    strengths: [],
    weaknesses: [],
    signals: {},
    trend: {
      current: score,
      previous: prev ?? score,
      delta: (prev != null) ? score - prev : 0,
      direction: 'stable',
    },
  };
}

describe('calculateMomentum', () => {
  it('computes weighted average of all pillars', () => {
    const pillars = {
      velocity: makePillar(80),
      ownership: makePillar(70),
      stability: makePillar(90),
      engagement: makePillar(60),
    };

    const result = calculateMomentum(pillars);
    const expected = Math.round(
      80 * 0.30 + 70 * 0.25 + 90 * 0.25 + 60 * 0.20,
    );
    expect(result.overall).toBe(expected);
  });

  it('uses custom weights when provided', () => {
    const pillars = {
      velocity: makePillar(100),
      ownership: makePillar(0),
      stability: makePillar(0),
      engagement: makePillar(0),
    };

    const result = calculateMomentum(pillars, { velocity: 100, ownership: 0, stability: 0, engagement: 0 });
    expect(result.overall).toBe(100);
  });

  it('computes trend from previous values', () => {
    const pillars = {
      velocity: makePillar(80, 70),
      ownership: makePillar(70, 65),
      stability: makePillar(90, 85),
      engagement: makePillar(60, 55),
    };

    const result = calculateMomentum(pillars);
    expect(result.trend.direction).toBe('up');
    expect(result.trend.delta).toBeGreaterThan(0);
  });

  it('returns 0 and stable trend when total weight is 0', () => {
    const pillars = {
      velocity: makePillar(50),
      ownership: makePillar(50),
      stability: makePillar(50),
      engagement: makePillar(50),
    };

    const result = calculateMomentum(pillars, { velocity: 0, ownership: 0, stability: 0, engagement: 0 });
    expect(result.overall).toBe(0);
    expect(result.trend.direction).toBe('stable');
  });

  it('rounds overall to nearest integer', () => {
    const pillars = {
      velocity: makePillar(33),
      ownership: makePillar(33),
      stability: makePillar(33),
      engagement: makePillar(33),
    };

    const result = calculateMomentum(pillars);
    expect(Number.isInteger(result.overall)).toBe(true);
  });
});
