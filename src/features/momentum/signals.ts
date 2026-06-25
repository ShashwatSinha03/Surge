import type { SignalPack } from './types';
import { momentumRepository } from './repository';
import { TREND_WINDOW_DAYS, STALE_DAYS, ORPHAN_DAYS, LONG_RUNNING_DAYS } from './weights';

async function extractVelocitySignals(questId: string) {
  const actions = await momentumRepository.getActions(questId);
  const milestones = await momentumRepository.getMilestones(questId);
  const events = await momentumRepository.getEvents(questId, TREND_WINDOW_DAYS * 2);
  const today = Date.now();

  const completed = actions.filter((a) => a.status === 'completed');
  const totalActions = actions.length;
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;

  const now = new Date();
  const windowStart = new Date(now.getTime() - TREND_WINDOW_DAYS * 86400000);
  const prevWindowStart = new Date(windowStart.getTime() - TREND_WINDOW_DAYS * 86400000);

  const recentCompletions = completed.filter(
    (a) => new Date(a.created_at).getTime() > windowStart.getTime(),
  );

  const prevCompletions = completed.filter(
    (a) => {
      const t = new Date(a.created_at).getTime();
      return t > prevWindowStart.getTime() && t <= windowStart.getTime();
    },
  );

  return {
    completedActions: completed.length,
    completedMilestones,
    completionRate: {
      rate: totalActions > 0 ? Math.round((completed.length / totalActions) * 100) : 100,
      total: totalActions,
      completed: completed.length,
    },
    completionTrend: {
      currentCount: recentCompletions.length,
      previousCount: prevCompletions.length,
      delta: recentCompletions.length - prevCompletions.length,
      direction: recentCompletions.length > prevCompletions.length
        ? 'up' as const
        : recentCompletions.length < prevCompletions.length
          ? 'down' as const
          : 'stable' as const,
    },
  };
}

async function extractOwnershipSignals(questId: string) {
  const actions = await momentumRepository.getActions(questId);
  const today = Date.now();
  const orphanThreshold = today - ORPHAN_DAYS * 86400000;

  const claimed = actions.filter((a) => a.owner_id);
  const unclaimed = actions.filter((a) => !a.owner_id);
  const uniqueOwners = new Set(claimed.map((a) => a.owner_id)).size;

  const orphaned = unclaimed.filter((a) => new Date(a.created_at).getTime() < orphanThreshold);
  const oldestOrphan = orphaned.length > 0
    ? Math.round((today - Math.min(...orphaned.map((a) => new Date(a.created_at).getTime()))) / 86400000)
    : 0;

  const actionCounts = new Map<string, number>();
  for (const a of claimed) {
    actionCounts.set(a.owner_id!, (actionCounts.get(a.owner_id!) ?? 0) + 1);
  }
  const counts = [...actionCounts.values()];
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  const concentration = counts.length > 0 && maxCount > 0
    ? Math.round((maxCount / (counts.reduce((s, c) => s + c, 0) / counts.length)) * 100) / 100
    : 0;

  return {
    claimedActions: { count: claimed.length, total: actions.length },
    unclaimedRatio: actions.length > 0 ? Math.round((unclaimed.length / actions.length) * 100) : 0,
    ownerDistribution: {
      uniqueOwners,
      totalActions: actions.length,
      concentration,
    },
    orphanedWork: {
      count: orphaned.length,
      oldestDays: oldestOrphan,
      items: orphaned.map((a) => ({ id: a.id, title: a.title })),
    },
  };
}

async function extractStabilitySignals(questId: string) {
  const actions = await momentumRepository.getActions(questId);
  const milestones = await momentumRepository.getMilestones(questId);
  const events = await momentumRepository.getEvents(questId);
  const today = Date.now();
  const staleThreshold = today - STALE_DAYS * 86400000;

  const blocked = actions.filter((a) => a.status === 'blocked');
  const blockedSeverity = blocked.length === 0 ? 'low' as const
    : blocked.length <= 2 ? 'medium' as const
    : 'high' as const;

  const staleMilestones = milestones.filter((m) => {
    if (m.status === 'completed') return false;
    const msEvents = events.filter((e) => e.event_type?.includes('MILESTONE_'));
    const lastEvent = msEvents.length > 0
      ? Math.max(...msEvents.map((e) => new Date(e.created_at).getTime()))
      : new Date(m.created_at).getTime();
    return lastEvent < staleThreshold;
  });

  const oldestStale = staleMilestones.length > 0
    ? Math.round((today - Math.min(...staleMilestones.map((m) => new Date(m.created_at).getTime()))) / 86400000)
    : 0;

  const longRunning = actions.filter((a) => {
    if (a.status === 'completed' || a.status === 'blocked') return false;
    const age = today - new Date(a.created_at).getTime();
    return age > LONG_RUNNING_DAYS * 86400000;
  });

  const oldestLongRunning = longRunning.length > 0
    ? Math.round((today - Math.min(...longRunning.map((a) => new Date(a.created_at).getTime()))) / 86400000)
    : 0;

  return {
    blockedActions: {
      count: blocked.length,
      severity: blockedSeverity,
      items: blocked.map((a) => ({ id: a.id, title: a.title })),
    },
    staleMilestones: {
      count: staleMilestones.length,
      oldestDays: oldestStale,
      items: staleMilestones.map((m) => ({ id: m.id, title: m.title })),
    },
    longRunningActions: {
      count: longRunning.length,
      oldestDays: oldestLongRunning,
      items: longRunning.map((a) => ({ id: a.id, title: a.title })),
    },
  };
}

async function extractEngagementSignals(questId: string) {
  const events = await momentumRepository.getEvents(questId, TREND_WINDOW_DAYS);
  const allEvents = await momentumRepository.getEvents(questId);
  const members = await momentumRepository.getMembers(questId);
  const today = Date.now();

  const recentActorIds = new Set(events.map((e) => e.actor_id));
  const activeMembers = recentActorIds.size;

  const actorCounts = new Map<string, number>();
  for (const e of allEvents) {
    actorCounts.set(e.actor_id, (actorCounts.get(e.actor_id) ?? 0) + 1);
  }
  const counts = [...actorCounts.values()];
  const avg = counts.length > 0 ? counts.reduce((s, c) => s + c, 0) / counts.length : 0;
  const variance = counts.length > 0
    ? counts.reduce((s, c) => s + (c - avg) ** 2, 0) / counts.length
    : 0;
  const evenness = avg > 0 ? Math.max(0, 1 - Math.sqrt(variance) / avg) : 0;

  const lastEvent = allEvents.length > 0 ? allEvents[0] : null;
  const daysSinceLastEvent = lastEvent
    ? Math.round((today - new Date(lastEvent.created_at).getTime()) / 86400000)
    : 999;

  return {
    activeMembers,
    participation: {
      activeMembers,
      totalMembers: members.length,
      evenness: Math.round(evenness * 100) / 100,
    },
    recency: {
      daysSinceLastEvent,
      lastEventType: lastEvent?.event_type ?? null,
    },
    rawEventCount: allEvents.length,
  };
}

export async function extractSignals(questId: string): Promise<SignalPack> {
  const [velocity, ownership, stability, engagement] = await Promise.all([
    extractVelocitySignals(questId),
    extractOwnershipSignals(questId),
    extractStabilitySignals(questId),
    extractEngagementSignals(questId),
  ]);

  return {
    velocity,
    ownership,
    stability,
    engagement,
  };
}
