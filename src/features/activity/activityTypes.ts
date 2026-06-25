export type ImportanceLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type ActivityActor = {
  name: string;
  avatar_url: string | null;
};

export type ActivityItem = {
  type: 'item';
  id: string;
  title: string;
  subtitle: string | null;
  actor: ActivityActor;
  icon: string;
  importance: ImportanceLevel;
  timestamp: string;
};

export type ActivityGroup = {
  type: 'group';
  id: string;
  title: string;
  actor: ActivityActor;
  icon: string;
  importance: ImportanceLevel;
  timestamp: string;
  count: number;
  items: ActivityItem[];
};

export type ActivityEntry = ActivityItem | ActivityGroup;

export type ActivityCursorResult = {
  items: ActivityEntry[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type ActivityFilter = 'all' | 'actions' | 'milestones' | 'members';

export type RawEventRow = {
  id: string;
  quest_id: string;
  actor_id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  metadata: {
    version: number;
    entitySnapshot?: Record<string, unknown>;
    changes?: Record<string, unknown>;
    actor?: ActivityActor;
  };
  created_at: string;
};
