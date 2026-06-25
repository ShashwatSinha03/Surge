import type { ActivityActor, RawEventRow } from '@/features/activity/activityTypes';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline' | 'syncing';

export type PresenceState = {
  userId: string;
  name: string;
  avatar: string | null;
  currentView: 'quest' | 'milestones' | 'activity' | 'team' | 'settings';
  currentEntity: string | null;
  lastHeartbeat: string;
};

export type OptimisticEntry<T> = {
  id: string;
  tempId: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  entity: T;
  previousSnapshot: T | null;
  error: string | null;
  createdAt: string;
};

export type RealtimeEvent = {
  type: 'domain_event';
  event: RawEventRow;
  receivedAt: string;
};

export type RealtimeSubscription = {
  questId: string;
  channelName: string;
  cleanup: () => void;
};

export type RealtimeBusCallback = (event: RealtimeEvent) => void;

export type RealtimeBusUnsubscribe = () => void;

export type EntityWithSync<T> = T & {
  _syncing?: boolean;
  _tempId?: string;
  _optimistic?: boolean;
};

export type MilestoneWithSync = EntityWithSync<{
  id: string;
  quest_id: string;
  title: string;
  status: string;
  position: number;
  created_by: string;
  created_at: string;
  actions: ActionWithSync[];
}>;

export type ActionWithSync = EntityWithSync<{
  id: string;
  quest_id: string;
  milestone_id: string;
  title: string;
  description: string | null;
  status: string;
  owner_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  owner_name: string | null;
  owner_avatar: string | null;
}>;
