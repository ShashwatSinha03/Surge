import { describe, it, expect } from 'vitest';
import { generateRecommendations } from '@/features/momentum/recommendations';
import type { SignalPack, BehaviorAssessment } from '@/features/momentum/types';

const baseSignals: SignalPack = {
  velocity: {
    completedActions: 0,
    completedMilestones: 0,
    completionRate: { rate: 0, total: 0, completed: 0 },
    completionTrend: { currentCount: 0, previousCount: 0, delta: 0, direction: 'stable' },
  },
  ownership: {
    claimedActions: { count: 0, total: 0 },
    unclaimedRatio: 0,
    ownerDistribution: { uniqueOwners: 0, totalActions: 0, concentration: 0 },
    orphanedWork: { count: 0, oldestDays: 0, items: [] },
  },
  stability: {
    blockedActions: { count: 0, severity: 'low', items: [] },
    staleMilestones: { count: 0, oldestDays: 0, items: [] },
    longRunningActions: { count: 0, oldestDays: 0, items: [] },
  },
  engagement: {
    activeMembers: 0,
    participation: { activeMembers: 0, totalMembers: 0, evenness: 0 },
    recency: { daysSinceLastEvent: 0, lastEventType: null },
    rawEventCount: 0,
  },
};

const defaultBehavior: BehaviorAssessment = {
  velocity: { pace: 'steady', consistency: 50, bottlenecks: [] },
  ownership: { clarity: 'clear', coverage: 100, risks: [] },
  stability: { health: 'stable', friction: [], blockers: [] },
  engagement: { health: 'engaged', participation: 'good', concerns: [] },
};

describe('generateRecommendations', () => {
  it('returns empty when no issues detected', () => {
    const recs = generateRecommendations(baseSignals, defaultBehavior);
    expect(recs).toEqual([]);
  });

  it('recommends resolving blocked actions', () => {
    const signals = {
      ...baseSignals,
      stability: {
        ...baseSignals.stability,
        blockedActions: {
          count: 2,
          severity: 'medium' as const,
          items: [{ id: 'a1', title: 'Blocked Action', milestoneTitle: 'Sprint 1' }],
        },
      },
    };
    const recs = generateRecommendations(signals, defaultBehavior);
    expect(recs[0].title).toContain('blocked');
    expect(recs[0].priority).toBe('high');
  });

  it('recommends assigning owners when >50% unclaimed', () => {
    const signals = {
      ...baseSignals,
      ownership: {
        ...baseSignals.ownership,
        claimedActions: { count: 2, total: 10 },
        unclaimedRatio: 80,
      },
    };
    const recs = generateRecommendations(signals, defaultBehavior);
    expect(recs.some((r) => r.title.includes('Assign owners'))).toBe(true);
  });

  it('does not recommend assigning owners when <=50% unclaimed', () => {
    const signals = {
      ...baseSignals,
      ownership: {
        ...baseSignals.ownership,
        claimedActions: { count: 6, total: 10 },
        unclaimedRatio: 40,
      },
    };
    const recs = generateRecommendations(signals, defaultBehavior);
    expect(recs.some((r) => r.title.includes('Assign owners'))).toBe(false);
  });

  it('recommends reviewing inactive milestones', () => {
    const signals = {
      ...baseSignals,
      stability: {
        ...baseSignals.stability,
        staleMilestones: {
          count: 1,
          oldestDays: 20,
          items: [{ id: 'm1', title: 'Old Milestone' }],
        },
      },
    };
    const recs = generateRecommendations(signals, defaultBehavior);
    expect(recs.some((r) => r.title.includes('inactive milestones'))).toBe(true);
  });

  it('recommends focusing on completion rate < 30%', () => {
    const signals = {
      ...baseSignals,
      velocity: {
        ...baseSignals.velocity,
        completionRate: { rate: 20, total: 10, completed: 2 },
      },
    };
    const recs = generateRecommendations(signals, defaultBehavior);
    expect(recs.some((r) => r.title.includes('completing existing work'))).toBe(true);
  });

  it('recommends addressing declining velocity', () => {
    const signals = {
      ...baseSignals,
      velocity: {
        ...baseSignals.velocity,
        completedActions: 5,
        completionTrend: { currentCount: 2, previousCount: 8, delta: -6, direction: 'down' as const },
      },
    };
    const recs = generateRecommendations(signals, defaultBehavior);
    expect(recs.some((r) => r.title.includes('declining velocity'))).toBe(true);
  });

  it('recommends resuming activity when inactive >7 days', () => {
    const signals = {
      ...baseSignals,
      engagement: {
        ...baseSignals.engagement,
        recency: { daysSinceLastEvent: 14, lastEventType: 'ACTION_COMPLETED' },
      },
    };
    const recs = generateRecommendations(signals, defaultBehavior);
    expect(recs.some((r) => r.title.includes('Resume project'))).toBe(true);
  });

  it('recommends re-engaging team when 0 active members', () => {
    const signals = {
      ...baseSignals,
      engagement: {
        ...baseSignals.engagement,
        participation: { activeMembers: 0, totalMembers: 5, evenness: 0 },
        recency: { daysSinceLastEvent: 3, lastEventType: null },
      },
    };
    const recs = generateRecommendations(signals, defaultBehavior);
    expect(recs.some((r) => r.title.includes('Re-engage'))).toBe(true);
  });
});
