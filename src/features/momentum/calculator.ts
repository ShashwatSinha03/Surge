import { getWeights, computeTrend } from './weights';
import type { MomentumWeights, PillarEvaluation, TrendDelta } from './types';

export function calculateMomentum(
  pillars: Record<string, PillarEvaluation>,
  weightOverrides?: Partial<MomentumWeights>,
): { overall: number; trend: TrendDelta } {
  const weights = getWeights(weightOverrides);
  const totalWeight = weights.velocity + weights.ownership + weights.stability + weights.engagement;

  if (totalWeight === 0) return { overall: 0, trend: { current: 0, previous: 0, delta: 0, direction: 'stable' } };

  const weighted = (
    pillars.velocity.score * (weights.velocity / totalWeight) +
    pillars.ownership.score * (weights.ownership / totalWeight) +
    pillars.stability.score * (weights.stability / totalWeight) +
    pillars.engagement.score * (weights.engagement / totalWeight)
  );

  const overall = Math.round(weighted);

  const prevWeighted = (
    (pillars.velocity.trend.previous ?? pillars.velocity.score) * (weights.velocity / totalWeight) +
    (pillars.ownership.trend.previous ?? pillars.ownership.score) * (weights.ownership / totalWeight) +
    (pillars.stability.trend.previous ?? pillars.stability.score) * (weights.stability / totalWeight) +
    (pillars.engagement.trend.previous ?? pillars.engagement.score) * (weights.engagement / totalWeight)
  );

  const trend = computeTrend(overall, Math.round(prevWeighted));

  return { overall, trend };
}
