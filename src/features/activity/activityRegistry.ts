import type { ImportanceLevel, RawEventRow, ActivityActor } from './activityTypes';

export type FormatterResult = {
  title: string;
  subtitle: string | null;
};

export type RegistryEntry = {
  icon: string;
  importance: ImportanceLevel;
  category: 'actions' | 'milestones' | 'members';
  format: (event: RawEventRow, actor: ActivityActor) => FormatterResult;
  groupKey: (event: RawEventRow) => string;
};

const snapshot = (event: RawEventRow) => event.metadata?.entitySnapshot ?? {};
const changes = (event: RawEventRow) => event.metadata?.changes ?? {};
const s = (event: RawEventRow, key: string) => String(snapshot(event)[key] ?? '');
const c = (event: RawEventRow, key: string) => String(changes(event)[key] ?? '');

export const activityRegistry: Record<string, RegistryEntry> = {
  ACTION_CREATED: {
    icon: 'CirclePlus',
    importance: 'NORMAL',
    category: 'actions',
    format: (event, actor) => ({
      title: `${actor.name} added ${s(event, 'title')}`,
      subtitle: null,
    }),
    groupKey: (event) => `ACTION_CREATED:${event.entity_id}`,
  },
  ACTION_UPDATED: {
    icon: 'PencilLine',
    importance: 'LOW',
    category: 'actions',
    format: (event, actor) => ({
      title: `${actor.name} edited ${s(event, 'title')}`,
      subtitle: null,
    }),
    groupKey: (event) => `ACTION_UPDATED:${event.entity_id}`,
  },
  ACTION_CLAIMED: {
    icon: 'UserCheck',
    importance: 'NORMAL',
    category: 'actions',
    format: (event, actor) => ({
      title: `${actor.name} claimed ${s(event, 'title')}`,
      subtitle: null,
    }),
    groupKey: (event) => `ACTION_CLAIMED:${event.entity_id}`,
  },
  ACTION_UNCLAIMED: {
    icon: 'UserX',
    importance: 'NORMAL',
    category: 'actions',
    format: (event, actor) => ({
      title: `${actor.name} unclaimed ${s(event, 'title')}`,
      subtitle: null,
    }),
    groupKey: (event) => `ACTION_UNCLAIMED:${event.entity_id}`,
  },
  ACTION_BLOCKED: {
    icon: 'Ban',
    importance: 'NORMAL',
    category: 'actions',
    format: (event, actor) => ({
      title: `${actor.name} blocked ${s(event, 'title')}`,
      subtitle: c(event, 'reason') || null,
    }),
    groupKey: (event) => `ACTION_BLOCKED:${event.entity_id}`,
  },
  ACTION_COMPLETED: {
    icon: 'CircleCheckBig',
    importance: 'HIGH',
    category: 'actions',
    format: (event, actor) => ({
      title: `${actor.name} completed ${s(event, 'title')}`,
      subtitle: null,
    }),
    groupKey: (event) => `ACTION_COMPLETED:${event.entity_id}`,
  },
  ACTION_DELETED: {
    icon: 'Trash2',
    importance: 'HIGH',
    category: 'actions',
    format: (event, actor) => ({
      title: `${actor.name} deleted ${s(event, 'title')}`,
      subtitle: null,
    }),
    groupKey: (event) => `ACTION_DELETED:${event.entity_id}`,
  },
  MILESTONE_CREATED: {
    icon: 'Flag',
    importance: 'HIGH',
    category: 'milestones',
    format: (event, actor) => ({
      title: `${actor.name} created milestone ${s(event, 'title')}`,
      subtitle: null,
    }),
    groupKey: (event) => `MILESTONE_CREATED:${event.entity_id}`,
  },
  MILESTONE_UPDATED: {
    icon: 'Flag',
    importance: 'LOW',
    category: 'milestones',
    format: (event, actor) => ({
      title: `${actor.name} edited ${s(event, 'title')}`,
      subtitle: null,
    }),
    groupKey: (event) => `MILESTONE_UPDATED:${event.entity_id}`,
  },
  MILESTONE_COMPLETED: {
    icon: 'CheckCircle2',
    importance: 'CRITICAL',
    category: 'milestones',
    format: (event, actor) => ({
      title: `${actor.name} completed milestone ${s(event, 'title')}`,
      subtitle: null,
    }),
    groupKey: (event) => `MILESTONE_COMPLETED:${event.entity_id}`,
  },
  MILESTONE_DELETED: {
    icon: 'FlagTriangleRight',
    importance: 'CRITICAL',
    category: 'milestones',
    format: (event, actor) => ({
      title: `${actor.name} deleted ${s(event, 'title')}`,
      subtitle: null,
    }),
    groupKey: (event) => `MILESTONE_DELETED:${event.entity_id}`,
  },
  INVITE_REVOKED: {
    icon: 'MailX',
    importance: 'HIGH',
    category: 'members',
    format: (event, actor) => ({
      title: `${actor.name} revoked invite for ${s(event, 'email') || 'a member'}`,
      subtitle: null,
    }),
    groupKey: (event) => `INVITE_REVOKED:${event.entity_id}`,
  },
  MEMBER_INVITED: {
    icon: 'MailPlus',
    importance: 'NORMAL',
    category: 'members',
    format: (event, actor) => ({
      title: `${actor.name} invited ${s(event, 'email') || 'a new member'}`,
      subtitle: null,
    }),
    groupKey: (event) => `MEMBER_INVITED:${event.entity_id}`,
  },
  MEMBER_JOINED: {
    icon: 'UserPlus',
    importance: 'NORMAL',
    category: 'members',
    format: (event, actor) => ({
      title: `${actor.name} joined`,
      subtitle: null,
    }),
    groupKey: (event) => `MEMBER_JOINED:${event.entity_id}`,
  },
  MEMBER_REMOVED: {
    icon: 'UserMinus',
    importance: 'CRITICAL',
    category: 'members',
    format: (event, actor) => ({
      title: `${actor.name} removed ${s(event, 'name') || 'a member'}`,
      subtitle: null,
    }),
    groupKey: (event) => `MEMBER_REMOVED:${event.entity_id}`,
  },
  ROLE_CHANGED: {
    icon: 'Shield',
    importance: 'HIGH',
    category: 'members',
    format: (event, actor) => ({
      title: `${actor.name} changed ${s(event, 'name') || 'a member'}`,
      subtitle: `${c(event, 'from') || '?'} → ${c(event, 'to') || '?'}`,
    }),
    groupKey: (event) => `ROLE_CHANGED:${event.entity_id}`,
  },
  QUEST_CREATED: {
    icon: 'Rocket',
    importance: 'CRITICAL',
    category: 'members',
    format: (event, actor) => ({
      title: `${actor.name} created ${s(event, 'title') || 'the quest'}`,
      subtitle: null,
    }),
    groupKey: (event) => `QUEST_CREATED:${event.quest_id}`,
  },
  QUEST_UPDATED: {
    icon: 'Settings',
    importance: 'LOW',
    category: 'members',
    format: (event, actor) => ({
      title: `${actor.name} updated the quest settings`,
      subtitle: null,
    }),
    groupKey: (event) => `QUEST_UPDATED:${event.quest_id}`,
  },
  QUEST_ARCHIVED: {
    icon: 'Archive',
    importance: 'CRITICAL',
    category: 'members',
    format: (event, actor) => ({
      title: `${actor.name} archived the quest`,
      subtitle: null,
    }),
    groupKey: (event) => `QUEST_ARCHIVED:${event.quest_id}`,
  },
};

export function getRegistryEntry(eventType: string): RegistryEntry | undefined {
  return activityRegistry[eventType];
}
