import { describe, it, expect } from 'vitest';
import {
  DEFAULT_WEIGHTS,
  TREND_THRESHOLDS,
  STALE_DAYS,
  ORPHAN_DAYS,
  LONG_RUNNING_DAYS,
  INACTIVITY_DAYS,
  TREND_WINDOW_DAYS,
  getWeights,
  computeTrend,
} from '@/features/momentum/weights';

describe('constants', () => {
  it('DEFAULT_WEIGHTS sum to 100', () => {
    const sum = DEFAULT_WEIGHTS.velocity + DEFAULT_WEIGHTS.ownership + DEFAULT_WEIGHTS.stability + DEFAULT_WEIGHTS.engagement;
    expect(sum).toBe(100);
  });

  it('TREND_THRESHOLDS has improvement at 5 and decline at -5', () => {
    expect(TREND_THRESHOLDS.improvement).toBe(5);
    expect(TREND_THRESHOLDS.decline).toBe(-5);
  });

  it('has reasonable time constants', () => {
    expect(STALE_DAYS).toBe(14);
    expect(ORPHAN_DAYS).toBe(3);
    expect(LONG_RUNNING_DAYS).toBe(14);
    expect(INACTIVITY_DAYS).toBe(7);
    expect(TREND_WINDOW_DAYS).toBe(7);
  });
});

describe('getWeights', () => {
  it('returns defaults when no overrides', () => {
    expect(getWeights()).toEqual(DEFAULT_WEIGHTS);
    expect(getWeights(undefined)).toEqual(DEFAULT_WEIGHTS);
  });

  it('merges partial overrides with defaults', () => {
    const result = getWeights({ velocity: 50 });
    expect(result.velocity).toBe(50);
    expect(result.ownership).toBe(DEFAULT_WEIGHTS.ownership);
    expect(result.stability).toBe(DEFAULT_WEIGHTS.stability);
    expect(result.engagement).toBe(DEFAULT_WEIGHTS.engagement);
  });

  it('overrides all values when provided', () => {
    const result = getWeights({ velocity: 25, ownership: 25, stability: 25, engagement: 25 });
    expect(result).toEqual({ velocity: 25, ownership: 25, stability: 25, engagement: 25 });
  });

  it('returns a new object each call', () => {
    const a = getWeights();
    const b = getWeights();
    expect(a).not.toBe(b);
  });
});

describe('computeTrend', () => {
  it('returns up when delta >= 5', () => {
    const result = computeTrend(80, 70);
    expect(result.delta).toBe(10);
    expect(result.direction).toBe('up');
    expect(result.current).toBe(80);
    expect(result.previous).toBe(70);
  });

  it('returns down when delta <= -5', () => {
    const result = computeTrend(60, 70);
    expect(result.delta).toBe(-10);
    expect(result.direction).toBe('down');
  });

  it('returns stable when delta is between -4 and 4', () => {
    expect(computeTrend(72, 70).direction).toBe('stable');
    expect(computeTrend(70, 72).direction).toBe('stable');
    expect(computeTrend(70, 70).direction).toBe('stable');
  });

  it('returns up when delta is exactly 5', () => {
    const result = computeTrend(75, 70);
    expect(result.direction).toBe('up');
  });

  it('returns down when delta is exactly -5', () => {
    const result = computeTrend(65, 70);
    expect(result.direction).toBe('down');
  });
});
