import type { SignalPack, MissionSummary, ExecutionHighlight, PillarEvaluation } from './types';

export function generateMissionSummary(
  momentum: number,
  pillars: Record<string, PillarEvaluation>,
): MissionSummary {
  const lowest = Object.entries(pillars).sort((a, b) => a[1].score - b[1].score)[0];
  const lowestName = lowest ? lowest[0] : '';
  const lowestScore = lowest ? lowest[1].score : 100;

  const status = momentum >= 70 && lowestScore >= 40
    ? 'healthy' as const
    : momentum >= 40 || lowestScore >= 20
      ? 'attention' as const
      : 'critical' as const;

  const attentionLevel = lowestScore < 20 || momentum < 30
    ? 'high' as const
    : lowestScore < 50 || momentum < 60
      ? 'medium' as const
      : 'low' as const;

  const parts: string[] = [];
  if (momentum >= 70) {
    parts.push('The project is progressing well.');
  } else if (momentum >= 40) {
    parts.push('The project is progressing but has areas needing attention.');
  } else {
    parts.push('The project requires significant attention.');
  }

  if (pillars.velocity.trend.direction === 'up') parts.push('Velocity improved this week.');
  if (pillars.velocity.trend.direction === 'down') parts.push('Velocity declined this week.');

  if (lowestScore < 50) {
    const name = lowestName.charAt(0).toUpperCase() + lowestName.slice(1);
    parts.push(`${name} needs attention.`);
  }

  return {
    status,
    summary: parts.join(' '),
    attentionLevel,
  };
}

export function generateHighlights(signals: SignalPack): ExecutionHighlight[] {
  const highlights: ExecutionHighlight[] = [];

  if (signals.velocity.completedActions > 0) {
    highlights.push({
      type: 'positive',
      label: 'actions completed',
      count: signals.velocity.completedActions,
    });
  }
  if (signals.velocity.completedMilestones > 0) {
    highlights.push({
      type: 'positive',
      label: 'milestones finished',
      count: signals.velocity.completedMilestones,
    });
  }
  if (signals.ownership.claimedActions.count > 0) {
    highlights.push({
      type: 'positive',
      label: 'actions claimed',
      count: signals.ownership.claimedActions.count,
    });
  }
  if (signals.stability.blockedActions.count > 0) {
    highlights.push({
      type: 'warning',
      label: 'blocked actions',
      count: signals.stability.blockedActions.count,
    });
  }
  if (signals.stability.staleMilestones.count > 0) {
    highlights.push({
      type: 'warning',
      label: 'inactive milestones',
      count: signals.stability.staleMilestones.count,
    });
  }
  if (signals.ownership.orphanedWork.count > 0) {
    highlights.push({
      type: 'warning',
      label: 'unclaimed actions',
      count: signals.ownership.orphanedWork.count,
    });
  }

  return highlights;
}
