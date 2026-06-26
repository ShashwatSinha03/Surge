import { describe, it, expect } from 'vitest';
import { generateMissionSummary, generateHighlights } from '@/features/momentum/summary';
import type { SignalPack, PillarEvaluation } from '@/features/momentum/types';

function makePillar(score: number, trendDir: 'up' | 'down' | 'stable' = 'stable', trendDelta = 0): PillarEvaluation {
  return {
    score,
    summary: '',
    strengths: [],
    weaknesses: [],
    signals: {},
    trend: { current: score, previous: score - trendDelta, delta: trendDelta, direction: trendDir },
  };
}

const defaultPillars = {
  velocity: makePillar(75),
  ownership: makePillar(65),
  stability: makePillar(70),
  engagement: makePillar(60),
};

describe('generateMissionSummary', () => {
  it('returns healthy status when momentum >= 70 and lowest >= 40', () => {
    const result = generateMissionSummary(75, defaultPillars);
    expect(result.status).toBe('healthy');
  });

  it('returns attention status when momentum >= 40 and lowest >= 20', () => {
    const pillars = {
      velocity: makePillar(55),
      ownership: makePillar(30),
      stability: makePillar(50),
      engagement: makePillar(40),
    };
    const result = generateMissionSummary(55, pillars);
    expect(result.status).toBe('attention');
  });

  it('returns critical status when momentum < 40 and lowest < 20', () => {
    const pillars = {
      velocity: makePillar(25),
      ownership: makePillar(10),
      stability: makePillar(30),
      engagement: makePillar(20),
    };
    const result = generateMissionSummary(25, pillars);
    expect(result.status).toBe('critical');
  });

  it('returns high attention level when lowest < 20 or momentum < 30', () => {
    const pillars = {
      velocity: makePillar(75),
      ownership: makePillar(15),
      stability: makePillar(70),
      engagement: makePillar(60),
    };
    const result = generateMissionSummary(75, pillars);
    expect(result.attentionLevel).toBe('high');
  });

  it('returns medium attention level when lowest < 50 or momentum < 60', () => {
    const pillars = {
      velocity: makePillar(55),
      ownership: makePillar(35),
      stability: makePillar(50),
      engagement: makePillar(40),
    };
    const result = generateMissionSummary(55, pillars);
    expect(result.attentionLevel).toBe('medium');
  });

  it('returns low attention level for high momentum and high scores', () => {
    const pillars = {
      velocity: makePillar(90),
      ownership: makePillar(85),
      stability: makePillar(95),
      engagement: makePillar(80),
    };
    const result = generateMissionSummary(90, pillars);
    expect(result.attentionLevel).toBe('low');
  });

  it('mentions improving velocity in summary', () => {
    const pillars = {
      velocity: makePillar(75, 'up', 10),
      ownership: makePillar(65),
      stability: makePillar(70),
      engagement: makePillar(60),
    };
    const result = generateMissionSummary(75, pillars);
    expect(result.summary).toContain('Velocity improved');
  });

  it('mentions declining velocity in summary', () => {
    const pillars = {
      velocity: makePillar(65, 'down', -10),
      ownership: makePillar(65),
      stability: makePillar(70),
      engagement: makePillar(60),
    };
    const result = generateMissionSummary(65, pillars);
    expect(result.summary).toContain('Velocity declined');
  });
});

describe('generateHighlights', () => {
  const baseSignals: SignalPack = {
    velocity: { completedActions: 0, completedMilestones: 0, completionRate: { rate: 0, total: 0, completed: 0 }, completionTrend: { currentCount: 0, previousCount: 0, delta: 0, direction: 'stable' } },
    ownership: { claimedActions: { count: 0, total: 0 }, unclaimedRatio: 0, ownerDistribution: { uniqueOwners: 0, totalActions: 0, concentration: 0 }, orphanedWork: { count: 0, oldestDays: 0, items: [] } },
    stability: { blockedActions: { count: 0, severity: 'low', items: [] }, staleMilestones: { count: 0, oldestDays: 0, items: [] }, longRunningActions: { count: 0, oldestDays: 0, items: [] } },
    engagement: { activeMembers: 0, participation: { activeMembers: 0, totalMembers: 0, evenness: 0 }, recency: { daysSinceLastEvent: 0, lastEventType: null }, rawEventCount: 0 },
  };

  it('returns empty highlights when no signals are present', () => {
    expect(generateHighlights(baseSignals)).toEqual([]);
  });

  it('adds positive highlight for completed actions', () => {
    const signals = { ...baseSignals, velocity: { ...baseSignals.velocity, completedActions: 5 } };
    const highlights = generateHighlights(signals);
    expect(highlights).toContainEqual(expect.objectContaining({ type: 'positive', label: 'actions completed', count: 5 }));
  });

  it('adds positive highlight for completed milestones', () => {
    const signals = { ...baseSignals, velocity: { ...baseSignals.velocity, completedMilestones: 2 } };
    const highlights = generateHighlights(signals);
    expect(highlights).toContainEqual(expect.objectContaining({ type: 'positive', label: 'milestones finished', count: 2 }));
  });

  it('adds positive highlight for claimed actions', () => {
    const signals = { ...baseSignals, ownership: { ...baseSignals.ownership, claimedActions: { count: 3, total: 5 } } };
    const highlights = generateHighlights(signals);
    expect(highlights).toContainEqual(expect.objectContaining({ type: 'positive', label: 'actions claimed', count: 3 }));
  });

  it('adds warning highlight for blocked actions', () => {
    const signals = { ...baseSignals, stability: { ...baseSignals.stability, blockedActions: { count: 2, severity: 'medium' as const, items: [{ id: '1', title: 'Blocked' }] } } };
    const highlights = generateHighlights(signals);
    expect(highlights).toContainEqual(expect.objectContaining({ type: 'warning', label: 'blocked actions', count: 2 }));
  });

  it('adds warning highlight for stale milestones', () => {
    const signals = { ...baseSignals, stability: { ...baseSignals.stability, staleMilestones: { count: 1, oldestDays: 20, items: [{ id: '1', title: 'Old Milestone' }] } } };
    const highlights = generateHighlights(signals);
    expect(highlights).toContainEqual(expect.objectContaining({ type: 'warning', label: 'inactive milestones', count: 1 }));
  });

  it('adds warning highlight for orphaned work', () => {
    const signals = { ...baseSignals, ownership: { ...baseSignals.ownership, orphanedWork: { count: 4, oldestDays: 5, items: [{ id: '1', title: 'Orphaned' }] } } };
    const highlights = generateHighlights(signals);
    expect(highlights).toContainEqual(expect.objectContaining({ type: 'warning', label: 'unclaimed actions', count: 4 }));
  });
});
