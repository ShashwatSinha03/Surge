import type { RawEventRow } from '@/features/activity/activityTypes';
import type { MilestoneWithSync, ActionWithSync } from './realtimeTypes';

export type MilestoneMap = Map<string, MilestoneWithSync>;

const ENTITY_ACTIONS = new Set([
  'ACTION_CREATED', 'ACTION_UPDATED', 'ACTION_CLAIMED',
  'ACTION_UNCLAIMED', 'ACTION_BLOCKED', 'ACTION_COMPLETED', 'ACTION_DELETED',
]);

const ENTITY_MILESTONES = new Set([
  'MILESTONE_CREATED', 'MILESTONE_UPDATED', 'MILESTONE_COMPLETED', 'MILESTONE_DELETED',
]);

const ENTITY_MEMBERS = new Set([
  'MEMBER_JOINED', 'MEMBER_REMOVED', 'ROLE_CHANGED',
]);

export function sortEvents(events: RawEventRow[]): RawEventRow[] {
  return [...events].sort((a, b) => {
    const timeCmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (timeCmp !== 0) return timeCmp;
    return a.id.localeCompare(b.id);
  });
}

export function reconcileMilestones(
  milestones: MilestoneWithSync[],
  event: RawEventRow
): MilestoneWithSync[] {
  const sorted = sortEvents([event])[0];
  if (!sorted) return milestones;

  const eventType = sorted.event_type;
  const snapshot = sorted.metadata?.entitySnapshot ?? {};
  const entityId = sorted.entity_id;

  if (ENTITY_ACTIONS.has(eventType)) {
    return reconcileActionEvent(milestones, eventType, entityId, snapshot);
  }

  if (ENTITY_MILESTONES.has(eventType)) {
    return reconcileMilestoneEvent(milestones, eventType, entityId, snapshot, sorted);
  }

  return milestones;
}

function reconcileActionEvent(
  milestones: MilestoneWithSync[],
  eventType: string,
  entityId: string,
  snapshot: Record<string, unknown>
): MilestoneWithSync[] {
  if (eventType === 'ACTION_DELETED') {
    return milestones.map((ms) => ({
      ...ms,
      actions: ms.actions.filter((a) => a.id !== entityId && a._tempId !== entityId),
    }));
  }

  if (eventType === 'ACTION_CREATED') {
    return milestones.map((ms) => {
      if (ms.actions.some((a) => a.id === entityId || a._tempId === entityId)) return ms;
      const newAction: ActionWithSync = {
        id: entityId,
        quest_id: ms.quest_id,
        milestone_id: ms.id,
        title: String(snapshot.title ?? ''),
        description: String(snapshot.description ?? '') || null,
        status: 'open',
        owner_id: null,
        created_by: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        owner_name: null,
        owner_avatar: null,
      };
      return { ...ms, actions: [...ms.actions, newAction] };
    });
  }

  return milestones.map((ms) => ({
    ...ms,
    actions: ms.actions.map((a) => {
      if (a.id !== entityId && a._tempId !== entityId) return a;
      const update: Partial<ActionWithSync> = {};
      if (snapshot.title) update.title = String(snapshot.title);
      if (snapshot.status) update.status = String(snapshot.status);
      if (eventType === 'ACTION_CLAIMED') {
        update.status = 'claimed';
        update.owner_id = String(snapshot.owner_id ?? '');
      }
      if (eventType === 'ACTION_UNCLAIMED') {
        update.status = 'open';
        update.owner_id = null;
      }
      if (eventType === 'ACTION_BLOCKED') update.status = 'blocked';
      if (eventType === 'ACTION_COMPLETED') update.status = 'completed';
      return { ...a, ...update, _syncing: false, _tempId: undefined };
    }),
  }));
}

function reconcileMilestoneEvent(
  milestones: MilestoneWithSync[],
  eventType: string,
  entityId: string,
  snapshot: Record<string, unknown>,
  event: RawEventRow
): MilestoneWithSync[] {
  if (eventType === 'MILESTONE_DELETED') {
    return milestones.filter((ms) => ms.id !== entityId);
  }

  if (eventType === 'MILESTONE_CREATED') {
    if (milestones.some((ms) => ms.id === entityId)) return milestones;
    const newMilestone: MilestoneWithSync = {
      id: entityId,
      quest_id: event.quest_id,
      title: String(snapshot.title ?? ''),
      status: 'open',
      position: milestones.length + 1,
      created_by: '',
      created_at: new Date().toISOString(),
      actions: [],
    };
    return [...milestones, newMilestone].sort((a, b) => a.position - b.position);
  }

  if (eventType === 'MILESTONE_UPDATED') {
    return milestones.map((ms) => {
      if (ms.id !== entityId) return ms;
      return { ...ms, title: String(snapshot.title ?? ms.title) };
    });
  }

  if (eventType === 'MILESTONE_COMPLETED') {
    return milestones.map((ms) => {
      if (ms.id !== entityId) return ms;
      return { ...ms, status: 'completed' };
    });
  }

  return milestones;
}
