import type { MomentumWeights } from './types';

export const DEFAULT_WEIGHTS: MomentumWeights = {
  velocity: 30,
  ownership: 25,
  stability: 25,
  engagement: 20,
} as const;

export const TREND_THRESHOLDS = {
  improvement: 5,
  decline: -5,
} as const;

export const STALE_DAYS = 14;
export const ORPHAN_DAYS = 3;
export const LONG_RUNNING_DAYS = 14;
export const INACTIVITY_DAYS = 7;
export const TREND_WINDOW_DAYS = 7;

export function getWeights(overrides?: Partial<MomentumWeights>): MomentumWeights {
  if (!overrides) return { ...DEFAULT_WEIGHTS };
  return {
    velocity: overrides.velocity ?? DEFAULT_WEIGHTS.velocity,
    ownership: overrides.ownership ?? DEFAULT_WEIGHTS.ownership,
    stability: overrides.stability ?? DEFAULT_WEIGHTS.stability,
    engagement: overrides.engagement ?? DEFAULT_WEIGHTS.engagement,
  };
}

export function computeTrend(current: number, previous: number) {
  const delta = current - previous;
  return {
    current,
    previous,
    delta,
    direction: (delta >= TREND_THRESHOLDS.improvement
      ? 'up'
      : delta <= TREND_THRESHOLDS.decline
        ? 'down'
        : 'stable') as 'up' | 'down' | 'stable',
  };
}
