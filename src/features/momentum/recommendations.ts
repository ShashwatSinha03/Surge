import type { SignalPack, BehaviorAssessment, Recommendation } from './types';

function formatList(items: { title: string }[], max = 3): string {
  return items.slice(0, max).map((i) => `"${i.title}"`).join(', ');
}

export function generateRecommendations(
  signals: SignalPack,
  behavior: BehaviorAssessment,
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (signals.stability.blockedActions.count > 0) {
    const items = signals.stability.blockedActions.items;
    const firstItem = items[0];
    const milestoneTitle = firstItem?.milestoneTitle;

    recs.push({
      title: 'Resolve blocked actions',
      description: milestoneTitle
        ? `${milestoneTitle} contains ${items.length} blocked action(s): ${formatList(items)}`
        : `${items.length} action(s) are blocked: ${formatList(items)}`,
      priority: 'high',
      reason: `${items.length} blocked action(s) are stalling progress`,
      relatedSignals: ['stability.blockedActions'],
      affectedEntity: firstItem ? { type: 'action', id: firstItem.id, label: firstItem.title } : undefined,
    });
  }

  if (signals.ownership.unclaimedRatio > 50) {
    const total = signals.ownership.claimedActions.total;
    const claimed = signals.ownership.claimedActions.count;
    const unclaimed = total - claimed;

    recs.push({
      title: 'Assign owners to unclaimed actions',
      description: `${unclaimed} of ${total} actions have no owner. Assign team members to clarify responsibility.`,
      priority: 'high',
      reason: `${signals.ownership.unclaimedRatio}% of actions are unclaimed`,
      relatedSignals: ['ownership.unclaimedRatio', 'ownership.claimedActions'],
    });
  }

  if (signals.stability.staleMilestones.count > 0) {
    const items = signals.stability.staleMilestones.items;
    recs.push({
      title: 'Review inactive milestones',
      description: `${items.length} milestone(s) have had no activity for ${signals.stability.staleMilestones.oldestDays}+ days: ${formatList(items)}`,
      priority: 'medium',
      reason: `Milestones inactive for extended period`,
      relatedSignals: ['stability.staleMilestones'],
      affectedEntity: items[0] ? { type: 'milestone', id: items[0].id, label: items[0].title } : undefined,
    });
  }

  if (signals.stability.longRunningActions.count > 0) {
    const items = signals.stability.longRunningActions.items;
    recs.push({
      title: 'Review aging actions',
      description: `${items.length} action(s) have been open for ${signals.stability.longRunningActions.oldestDays}+ days: ${formatList(items)}`,
      priority: 'low',
      reason: `Long-open actions may become stale or blocked`,
      relatedSignals: ['stability.longRunningActions'],
      affectedEntity: items[0] ? { type: 'action', id: items[0].id, label: items[0].title } : undefined,
    });
  }

  if (signals.velocity.completionRate.rate < 30 && signals.velocity.completionRate.total > 0) {
    recs.push({
      title: 'Focus on completing existing work',
      description: `Only ${signals.velocity.completionRate.completed} of ${signals.velocity.completionRate.total} actions are complete (${signals.velocity.completionRate.rate}%). Prioritize finishing open work before adding more.`,
      priority: 'medium',
      reason: `Completion rate is ${signals.velocity.completionRate.rate}%`,
      relatedSignals: ['velocity.completionRate'],
    });
  }

  if (signals.velocity.completionTrend.direction === 'down' && signals.velocity.completedActions > 0) {
    recs.push({
      title: 'Address declining velocity',
      description: `Completion dropped from ${signals.velocity.completionTrend.previousCount} to ${signals.velocity.completionTrend.currentCount} actions this week. Identify blockers or context switches.`,
      priority: 'medium',
      reason: `Velocity declined by ${Math.abs(signals.velocity.completionTrend.delta)} completions`,
      relatedSignals: ['velocity.completionTrend'],
    });
  }

  if (signals.engagement.recency.daysSinceLastEvent > 7) {
    recs.push({
      title: 'Resume project activity',
      description: `No activity for ${signals.engagement.recency.daysSinceLastEvent} days. Schedule a sync to re-engage the team.`,
      priority: 'medium',
      reason: `Project has been inactive for ${signals.engagement.recency.daysSinceLastEvent} days`,
      relatedSignals: ['engagement.recency'],
    });
  }

  if (signals.engagement.participation.activeMembers === 0 && signals.engagement.participation.totalMembers > 0) {
    recs.push({
      title: 'Re-engage team members',
      description: `None of ${signals.engagement.participation.totalMembers} team members have been active recently. Kick off a working session.`,
      priority: 'low',
      reason: `No team activity detected`,
      relatedSignals: ['engagement.participation', 'engagement.recency'],
    });
  }

  return recs;
}
