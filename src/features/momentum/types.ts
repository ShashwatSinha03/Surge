export type MissionStatus = 'healthy' | 'attention' | 'critical';
export type AttentionLevel = 'low' | 'medium' | 'high';
export type TrendDirection = 'up' | 'down' | 'stable';
export type Priority = 'high' | 'medium' | 'low';
export type HighlightType = 'positive' | 'warning';

export type TrendDelta = {
  current: number;
  previous: number;
  delta: number;
  direction: TrendDirection;
};

export type MissionSummary = {
  status: MissionStatus;
  summary: string;
  attentionLevel: AttentionLevel;
};

export type ExecutionHighlight = {
  type: HighlightType;
  label: string;
  count: number;
};

export type ActionRef = {
  id: string;
  title: string;
  milestoneTitle?: string;
  milestoneId?: string;
};

export type MilestoneRef = {
  id: string;
  title: string;
};

export type CompletionSignal = {
  rate: number;
  total: number;
  completed: number;
};

export type CompletionTrend = {
  currentCount: number;
  previousCount: number;
  delta: number;
  direction: TrendDirection;
};

export type OwnerDistSignal = {
  uniqueOwners: number;
  totalActions: number;
  concentration: number;
};

export type BlockedSignal = {
  count: number;
  severity: 'low' | 'medium' | 'high';
  items: ActionRef[];
};

export type StaleMilestoneSignal = {
  count: number;
  oldestDays: number;
  items: MilestoneRef[];
};

export type LongRunningSignal = {
  count: number;
  oldestDays: number;
  items: ActionRef[];
};

export type OrphanedSignal = {
  count: number;
  oldestDays: number;
  items: ActionRef[];
};

export type ParticipationSignal = {
  activeMembers: number;
  totalMembers: number;
  evenness: number;
};

export type RecencySignal = {
  daysSinceLastEvent: number;
  lastEventType: string | null;
};

export type SignalPack = {
  velocity: {
    completedActions: number;
    completedMilestones: number;
    completionRate: CompletionSignal;
    completionTrend: CompletionTrend;
  };
  ownership: {
    claimedActions: { count: number; total: number };
    unclaimedRatio: number;
    ownerDistribution: OwnerDistSignal;
    orphanedWork: OrphanedSignal;
  };
  stability: {
    blockedActions: BlockedSignal;
    staleMilestones: StaleMilestoneSignal;
    longRunningActions: LongRunningSignal;
  };
  engagement: {
    activeMembers: number;
    participation: ParticipationSignal;
    recency: RecencySignal;
    rawEventCount: number;
  };
};

export type BehaviorAssessment = {
  velocity: {
    pace: 'accelerating' | 'steady' | 'slowing' | 'stalled';
    consistency: number;
    bottlenecks: string[];
  };
  ownership: {
    clarity: 'clear' | 'mixed' | 'unclear';
    coverage: number;
    risks: string[];
  };
  stability: {
    health: 'stable' | 'at-risk' | 'unstable';
    friction: string[];
    blockers: string[];
  };
  engagement: {
    health: 'engaged' | 'moderate' | 'disengaged';
    participation: string;
    concerns: string[];
  };
};

export type PillarEvaluation = {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  signals: Record<string, unknown>;
  trend: TrendDelta;
};

export type MomentumWeights = {
  velocity: number;
  ownership: number;
  stability: number;
  engagement: number;
};

export type Recommendation = {
  title: string;
  description: string;
  priority: Priority;
  reason: string;
  relatedSignals: string[];
  affectedEntity?: {
    type: string;
    id: string;
    label: string;
  };
};

export type MomentumResponse = {
  mission: MissionSummary;
  momentum: {
    overall: number;
    trend: TrendDelta;
  };
  highlights: ExecutionHighlight[];
  pillars: Record<string, PillarEvaluation>;
  recommendations: Recommendation[];
  lastCalculated: string;
};
