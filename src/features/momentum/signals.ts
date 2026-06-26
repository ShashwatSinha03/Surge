import type { SignalPack } from './types';
import { momentumRepository } from './repository';
import { TREND_WINDOW_DAYS, STALE_DAYS, ORPHAN_DAYS, LONG_RUNNING_DAYS } from './weights';

const MS_PER_DAY = 86400000;

async function extractVelocitySignals(questId: string, timeOffset = 0) {
  const actions = await momentumRepository.getActions(questId);
  const milestones = await momentumRepository.getMilestones(questId);
  const events = await momentumRepository.getEvents(questId, TREND_WINDOW_DAYS * 2 + timeOffset);

  const completed = actions.filter((a) => a.status === 'completed');
  const totalActions = actions.length;
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;

  const offsetMs = timeOffset * MS_PER_DAY;
  const shiftedNow = Date.now() - offsetMs;
  const windowStart = shiftedNow - TREND_WINDOW_DAYS * MS_PER_DAY;
  const prevWindowStart = windowStart - TREND_WINDOW_DAYS * MS_PER_DAY;

  const recentCompletions = completed.filter(
    (a) => new Date(a.created_at).getTime() > windowStart,
  );

  const prevCompletions = completed.filter(
    (a) => {
      const t = new Date(a.created_at).getTime();
      return t > prevWindowStart && t <= windowStart;
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

async function extractOwnershipSignals(questId: string, timeOffset = 0) {
  const actions = await momentumRepository.getActions(questId);
  const offsetMs = timeOffset * MS_PER_DAY;
  const refTime = Date.now() - offsetMs;
  const orphanThreshold = refTime - ORPHAN_DAYS * MS_PER_DAY;

  const relevant = timeOffset > 0
    ? actions.filter((a) => new Date(a.created_at).getTime() < refTime)
    : actions;

  const claimed = relevant.filter((a) => a.owner_id);
  const unclaimed = relevant.filter((a) => !a.owner_id);
  const uniqueOwners = new Set(claimed.map((a) => a.owner_id)).size;

  const orphaned = unclaimed.filter((a) => new Date(a.created_at).getTime() < orphanThreshold);
  const oldestOrphan = orphaned.length > 0
    ? Math.round((refTime - Math.min(...orphaned.map((a) => new Date(a.created_at).getTime()))) / MS_PER_DAY)
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
    claimedActions: { count: claimed.length, total: relevant.length },
    unclaimedRatio: relevant.length > 0 ? Math.round((unclaimed.length / relevant.length) * 100) : 0,
    ownerDistribution: {
      uniqueOwners,
      totalActions: relevant.length,
      concentration,
    },
    orphanedWork: {
      count: orphaned.length,
      oldestDays: oldestOrphan,
      items: orphaned.map((a) => ({ id: a.id, title: a.title })),
    },
  };
}

async function extractStabilitySignals(questId: string, timeOffset = 0) {
  const actions = await momentumRepository.getActions(questId);
  const milestones = await momentumRepository.getMilestones(questId);
  const events = await momentumRepository.getEvents(questId);
  const offsetMs = timeOffset * MS_PER_DAY;
  const refTime = Date.now() - offsetMs;
  const staleThreshold = refTime - STALE_DAYS * MS_PER_DAY;

  const relevantActions = timeOffset > 0
    ? actions.filter((a) => new Date(a.created_at).getTime() < refTime)
    : actions;
  const relevantMilestones = timeOffset > 0
    ? milestones.filter((m) => new Date(m.created_at).getTime() < refTime)
    : milestones;

  const blocked = relevantActions.filter((a) => a.status === 'blocked');
  const blockedSeverity = blocked.length === 0 ? 'low' as const
    : blocked.length <= 2 ? 'medium' as const
    : 'high' as const;

  const staleMilestones = relevantMilestones.filter((m) => {
    if (m.status === 'completed') return false;
    const msEvents = events.filter((e) => e.event_type?.includes('MILESTONE_'));
    const lastEvent = msEvents.length > 0
      ? Math.max(...msEvents.map((e) => new Date(e.created_at).getTime()))
      : new Date(m.created_at).getTime();
    return lastEvent < staleThreshold;
  });

  const oldestStale = staleMilestones.length > 0
    ? Math.round((refTime - Math.min(...staleMilestones.map((m) => new Date(m.created_at).getTime()))) / MS_PER_DAY)
    : 0;

  const longRunning = relevantActions.filter((a) => {
    if (a.status === 'completed' || a.status === 'blocked') return false;
    const age = refTime - new Date(a.created_at).getTime();
    return age > LONG_RUNNING_DAYS * MS_PER_DAY;
  });

  const oldestLongRunning = longRunning.length > 0
    ? Math.round((refTime - Math.min(...longRunning.map((a) => new Date(a.created_at).getTime()))) / MS_PER_DAY)
    : 0;

  const milestoneTitles = new Map(relevantMilestones.map((m) => [m.id, m.title]));
  const blockedWithNames = blocked.map((a) => ({
    id: a.id,
    title: a.title,
    milestoneTitle: milestoneTitles.get(a.milestone_id) ?? 'Unknown',
  }));
  const staleWithNames = staleMilestones.map((m) => ({ id: m.id, title: m.title }));

  return {
    blockedActions: {
      count: blocked.length,
      severity: blockedSeverity,
      items: blockedWithNames,
    },
    staleMilestones: {
      count: staleMilestones.length,
      oldestDays: oldestStale,
      items: staleWithNames,
    },
    longRunningActions: {
      count: longRunning.length,
      oldestDays: oldestLongRunning,
      items: longRunning.map((a) => ({ id: a.id, title: a.title })),
    },
  };
}

async function extractEngagementSignals(questId: string, timeOffset = 0) {
  const offsetMs = timeOffset * MS_PER_DAY;
  const refTime = Date.now() - offsetMs;
  const windowStart = refTime - TREND_WINDOW_DAYS * MS_PER_DAY;

  const allEvents = await momentumRepository.getEvents(questId);
  const members = await momentumRepository.getMembers(questId);

  const windowEvents = allEvents.filter((e) => {
    const t = new Date(e.created_at).getTime();
    return t > windowStart && t <= refTime;
  });

  const recentActorIds = new Set(windowEvents.map((e) => e.actor_id));
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
    ? Math.round((refTime - new Date(lastEvent.created_at).getTime()) / MS_PER_DAY)
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

export async function extractSignalsWithPrev(questId: string): Promise<{ current: SignalPack; prev: SignalPack }> {
  const [current, prev] = await Promise.all([
    Promise.all([
      extractVelocitySignals(questId),
      extractOwnershipSignals(questId),
      extractStabilitySignals(questId),
      extractEngagementSignals(questId),
    ]),
    Promise.all([
      extractVelocitySignals(questId, TREND_WINDOW_DAYS),
      extractOwnershipSignals(questId, TREND_WINDOW_DAYS),
      extractStabilitySignals(questId, TREND_WINDOW_DAYS),
      extractEngagementSignals(questId, TREND_WINDOW_DAYS),
    ]),
  ]);

  return {
    current: { velocity: current[0], ownership: current[1], stability: current[2], engagement: current[3] },
    prev: { velocity: prev[0], ownership: prev[1], stability: prev[2], engagement: prev[3] },
  };
}
