import type { SignalPack, BehaviorAssessment, PillarEvaluation, TrendDelta } from './types';
import { STALE_DAYS, ORPHAN_DAYS, LONG_RUNNING_DAYS, INACTIVITY_DAYS, computeTrend } from './weights';

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function evaluateVelocity(signals: SignalPack['velocity'], behavior: BehaviorAssessment['velocity'], prevSignals?: SignalPack['velocity']): PillarEvaluation {
  const { completionRate, completionTrend, completedActions, completedMilestones } = signals;

  const rateScore = completionRate.rate;
  const trendScore = completionTrend.direction === 'up' ? 20
    : completionTrend.direction === 'stable' ? 10 : 0;
  const volumeScore = Math.min(25, completedActions * 2 + completedMilestones * 5);

  const score = clamp(rateScore * 0.55 + volumeScore + trendScore);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (completedActions > 0) strengths.push(`${completedActions} actions completed`);
  if (completedMilestones > 0) strengths.push(`${completedMilestones} milestones finished`);
  if (completionTrend.direction === 'up') strengths.push('Completion rate is improving');

  if (completionRate.rate < 30) weaknesses.push('Most actions remain incomplete');
  if (completionTrend.direction === 'down') weaknesses.push('Completion rate is declining');
  if (completedActions === 0 && completionRate.total > 0) weaknesses.push('No actions completed yet');

  const { pace, consistency, bottlenecks } = behavior;
  if (bottlenecks.length > 0) weaknesses.push(...bottlenecks);

  const summary = score >= 70
    ? 'The team is completing work at a healthy pace.'
    : score >= 40
      ? 'Work is progressing but completion could improve.'
      : 'Work completion needs attention.';

  const prevRate = prevSignals?.completionRate.rate ?? completionRate.rate;
  const trend: TrendDelta = computeTrend(score, prevSignals
    ? clamp(prevSignals.completionRate.rate * 0.55 + Math.min(25, prevSignals.completedActions * 2 + (prevSignals?.completedMilestones ?? 0) * 5) + (prevSignals?.completionTrend.direction === 'up' ? 20 : prevSignals?.completionTrend.direction === 'stable' ? 10 : 0))
    : score);

  return {
    score,
    summary,
    strengths,
    weaknesses,
    signals: {
      completedActions,
      completedMilestones,
      completionRate: `${completionRate.completed}/${completionRate.total}`,
      pace,
    },
    trend,
  };
}

function evaluateOwnership(signals: SignalPack['ownership'], behavior: BehaviorAssessment['ownership']): PillarEvaluation {
  const { claimedActions, unclaimedRatio, ownerDistribution, orphanedWork } = signals;

  const claimScore = 100 - unclaimedRatio;
  const distScore = ownerDistribution.uniqueOwners >= 2 ? 20 : ownerDistribution.uniqueOwners === 1 ? 5 : 0;
  const concPenalty = ownerDistribution.concentration > 2 ? Math.min(15, (ownerDistribution.concentration - 2) * 5) : 0;
  const orphanPenalty = Math.min(20, orphanedWork.count * 5);

  const score = clamp(claimScore * 0.6 + distScore - concPenalty - orphanPenalty);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (claimedActions.count === claimedActions.total && claimedActions.total > 0) {
    strengths.push('Every action has an owner');
  } else if (claimedActions.count > 0) {
    strengths.push(`${claimedActions.count}/${claimedActions.total} actions are claimed`);
  }
  if (ownerDistribution.uniqueOwners >= 3) {
    strengths.push(`Work is distributed across ${ownerDistribution.uniqueOwners} team members`);
  }

  if (unclaimedRatio > 50) weaknesses.push(`${unclaimedRatio}% of actions have no owner`);
  if (orphanedWork.count > 0) weaknesses.push(`${orphanedWork.count} action(s) unclaimed for ${ORPHAN_DAYS}+ days`);
  if (ownerDistribution.uniqueOwners <= 1 && claimedActions.count > 1) {
    weaknesses.push('All claimed work belongs to one person');
  }
  if (behavior.risks.length > 0) weaknesses.push(...behavior.risks);

  const summary = score >= 70
    ? 'Ownership is well distributed across the team.'
    : score >= 40
      ? 'Some actions need clearer ownership.'
      : 'Ownership needs significant improvement.';

  const trend: TrendDelta = computeTrend(score, score);

  return { score, summary, strengths, weaknesses, signals: { claimedActions, unclaimedRatio, ownerDistribution, orphanedWork: orphanedWork.count }, trend };
}

function evaluateStability(signals: SignalPack['stability'], behavior: BehaviorAssessment['stability']): PillarEvaluation {
  const { blockedActions, staleMilestones, longRunningActions } = signals;

  const blockPenalty = Math.min(35, blockedActions.count * 12);
  const stalePenalty = Math.min(30, staleMilestones.count * 15);
  const longRunningPenalty = Math.min(20, longRunningActions.count * 5);

  const score = clamp(100 - blockPenalty - stalePenalty - longRunningPenalty);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (blockedActions.count === 0 && staleMilestones.count === 0) {
    strengths.push('No blockers or stale work');
  }
  if (blockedActions.count === 0) strengths.push('No blocked actions');
  if (staleMilestones.count === 0) strengths.push('All milestones are active');

  if (blockedActions.count > 0) weaknesses.push(`${blockedActions.count} action(s) blocked`);
  if (staleMilestones.count > 0) weaknesses.push(`${staleMilestones.count} milestone(s) inactive for ${STALE_DAYS}+ days`);
  if (longRunningActions.count > 0) weaknesses.push(`${longRunningActions.count} action(s) open for ${LONG_RUNNING_DAYS}+ days`);
  if (behavior.friction.length > 0) weaknesses.push(...behavior.friction);
  if (behavior.blockers.length > 0) weaknesses.push(...behavior.blockers);

  const summary = score >= 70
    ? 'Project execution is stable with minimal friction.'
    : score >= 40
      ? 'Some instability needs attention.'
      : 'Multiple stability issues require intervention.';

  const trend: TrendDelta = computeTrend(score, score);

  return { score, summary, strengths, weaknesses, signals: { blockedActions: blockedActions.count, staleMilestones: staleMilestones.count, longRunningActions: longRunningActions.count, health: behavior.health }, trend };
}

function evaluateEngagement(signals: SignalPack['engagement'], behavior: BehaviorAssessment['engagement']): PillarEvaluation {
  const { activeMembers, participation, recency, rawEventCount } = signals;

  const partRate = participation.totalMembers > 0 ? activeMembers / participation.totalMembers : 0;
  const partScore = Math.round(partRate * 40);
  const recencyScore = recency.daysSinceLastEvent <= 3 ? 30
    : recency.daysSinceLastEvent <= 7 ? 20
      : recency.daysSinceLastEvent <= 14 ? 10 : 0;
  const volumeScore = Math.min(20, Math.round(rawEventCount / 3));
  const evennessBonus = Math.round(participation.evenness * 10);

  const score = clamp(partScore + recencyScore + volumeScore + evennessBonus);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (activeMembers > 0) strengths.push(`${activeMembers} team members recently active`);
  if (recency.daysSinceLastEvent <= 3) strengths.push('Activity in the last 3 days');
  if (participation.evenness > 0.7) strengths.push('Even participation across team');

  if (recency.daysSinceLastEvent > INACTIVITY_DAYS) {
    weaknesses.push(`No activity for ${recency.daysSinceLastEvent} days`);
  }
  if (partRate < 0.3 && participation.totalMembers > 2) {
    weaknesses.push('Most team members are not participating');
  }
  if (behavior.concerns.length > 0) weaknesses.push(...behavior.concerns);

  const summary = score >= 70
    ? 'The team is actively engaged in the project.'
    : score >= 40
      ? 'Team engagement is moderate.'
      : 'Team engagement needs attention.';

  const trend: TrendDelta = computeTrend(score, score);

  return { score, summary, strengths, weaknesses, signals: { activeMembers, totalMembers: participation.totalMembers, daysSinceLastEvent: recency.daysSinceLastEvent, evenness: participation.evenness }, trend };
}

export function evaluatePillars(signals: SignalPack, behavior: BehaviorAssessment, prevSignals?: SignalPack): Record<string, PillarEvaluation> {
  return {
    velocity: evaluateVelocity(signals.velocity, behavior.velocity, prevSignals?.velocity),
    ownership: evaluateOwnership(signals.ownership, behavior.ownership),
    stability: evaluateStability(signals.stability, behavior.stability),
    engagement: evaluateEngagement(signals.engagement, behavior.engagement),
  };
}
