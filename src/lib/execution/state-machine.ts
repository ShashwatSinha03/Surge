import type { ActionStatus } from '@/types';

const VALID_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  open: ['claimed', 'blocked'],
  claimed: ['completed', 'blocked'],
  blocked: ['claimed'],
  completed: [],
};

export function canTransition(
  from: ActionStatus,
  to: ActionStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function normalizePositions(
  items: { id: string; position: number }[]
): { id: string; position: number }[] {
  return items
    .sort((a, b) => a.position - b.position)
    .map((item, index) => ({ id: item.id, position: index + 1 }));
}

export function calculateMilestoneStatus(
  actionCount: number,
  completedCount: number
): 'open' | 'completed' {
  if (actionCount === 0) return 'open';
  return actionCount === completedCount ? 'completed' : 'open';
}
