import type { SignalPack, BehaviorAssessment } from './types';

function assessVelocityBehavior(signals: SignalPack['velocity']): BehaviorAssessment['velocity'] {
  const { completionTrend, completionRate, completedActions } = signals;

  if (completedActions === 0 && completionRate.total > 0) {
    return {
      pace: 'stalled',
      consistency: 0,
      bottlenecks: ['No work has been completed'],
    };
  }

  const pace = completionRate.rate >= 70
    ? completionTrend.direction === 'up' ? 'accelerating' : 'steady'
    : completionRate.rate >= 30
      ? completionTrend.direction === 'down' ? 'slowing' : 'steady'
      : 'stalled';

  const bottlenecks: string[] = [];
  if (completionTrend.direction === 'down' && completionTrend.delta <= -3) {
    bottlenecks.push('Completion rate is declining');
  }
  if (completionRate.rate < 30) {
    bottlenecks.push('Most actions remain incomplete');
  }

  return {
    pace,
    consistency: completionTrend.delta >= 0
      ? Math.min(100, 50 + completionRate.rate / 2)
      : Math.max(0, 50 - Math.abs(completionTrend.delta) * 10),
    bottlenecks,
  };
}

function assessOwnershipBehavior(signals: SignalPack['ownership']): BehaviorAssessment['ownership'] {
  const { claimedActions, unclaimedRatio, ownerDistribution, orphanedWork } = signals;

  const clarity = claimedActions.count === 0
    ? 'unclear'
    : unclaimedRatio > 50
      ? 'mixed'
      : 'clear';

  const total = ownerDistribution.uniqueOwners > 0
    ? Math.max(1, ownerDistribution.uniqueOwners)
    : 1;
  const coverage = Math.round((claimedActions.count / Math.max(1, claimedActions.total)) * 100);

  const risks: string[] = [];
  if (orphanedWork.count > 0) {
    risks.push(`${orphanedWork.count} action(s) remain unclaimed for ${orphanedWork.oldestDays}+ days`);
  }
  if (ownerDistribution.concentration > 2) {
    risks.push('Work is concentrated on too few team members');
  }
  if (ownerDistribution.uniqueOwners <= 1 && claimedActions.count > 0) {
    risks.push('Only one person owns all claimed work');
  }

  return { clarity, coverage, risks };
}

function assessStabilityBehavior(signals: SignalPack['stability']): BehaviorAssessment['stability'] {
  const { blockedActions, staleMilestones, longRunningActions } = signals;

  const health = blockedActions.count > 3 || staleMilestones.count > 2
    ? 'unstable'
    : blockedActions.count > 0 || staleMilestones.count > 0 || longRunningActions.count > 0
      ? 'at-risk'
      : 'stable';

  const friction: string[] = [];
  if (staleMilestones.count > 0) {
    friction.push(`${staleMilestones.count} milestone(s) inactive for ${staleMilestones.oldestDays}+ days`);
  }
  if (longRunningActions.count > 0) {
    friction.push(`${longRunningActions.count} action(s) open for ${longRunningActions.oldestDays}+ days`);
  }

  const blockers: string[] = [];
  if (blockedActions.count > 0) {
    const details = blockedActions.items.slice(0, 3).map((a) => a.title).join(', ');
    blockers.push(`${blockedActions.count} blocked action(s): ${details}`);
  }

  return { health, friction, blockers };
}

function assessEngagementBehavior(signals: SignalPack['engagement']): BehaviorAssessment['engagement'] {
  const { activeMembers, participation, recency } = signals;

  const participationRate = participation.totalMembers > 0
    ? activeMembers / participation.totalMembers
    : 0;

  const health = participationRate >= 0.5 && recency.daysSinceLastEvent <= 7
    ? 'engaged'
    : participationRate >= 0.2 || recency.daysSinceLastEvent <= 14
      ? 'moderate'
      : 'disengaged';

  const participationDesc = participationRate >= 0.5
    ? 'Most team members are actively participating'
    : participationRate >= 0.2
      ? 'Some team members are participating'
      : 'Few team members are participating';

  const concerns: string[] = [];
  if (recency.daysSinceLastEvent > 7) {
    concerns.push(`No activity for ${recency.daysSinceLastEvent} days`);
  }
  if (participationRate < 0.3 && participation.totalMembers > 2) {
    concerns.push('Participation is concentrated among few members');
  }

  return { health, participation: participationDesc, concerns };
}

export async function analyzeBehavior(signals: SignalPack): Promise<BehaviorAssessment> {
  return {
    velocity: assessVelocityBehavior(signals.velocity),
    ownership: assessOwnershipBehavior(signals.ownership),
    stability: assessStabilityBehavior(signals.stability),
    engagement: assessEngagementBehavior(signals.engagement),
  };
}
