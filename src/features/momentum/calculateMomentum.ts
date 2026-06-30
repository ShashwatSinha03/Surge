import { extractSignalsWithPrev } from './signals';
import { analyzeBehavior } from './behavior';
import { evaluatePillars } from './pillars';
import { calculateMomentum } from './calculator';
import { generateRecommendations } from './recommendations';
import { generateMissionSummary, generateHighlights } from './summary';
import type { MomentumResponse } from './types';

export async function calculateQuestMomentum(questId: string): Promise<MomentumResponse> {
  const { current: signals, prev: prevSignals } = await extractSignalsWithPrev(questId);
  const behavior = await analyzeBehavior(signals);
  const pillars = evaluatePillars(signals, behavior, prevSignals);
  const momentum = calculateMomentum(pillars);
  const recommendations = generateRecommendations(signals, behavior);
  const mission = generateMissionSummary(momentum.overall, pillars);
  const highlights = generateHighlights(signals);

  return {
    mission,
    momentum,
    highlights,
    pillars,
    recommendations,
    lastCalculated: new Date().toISOString(),
  };
}
