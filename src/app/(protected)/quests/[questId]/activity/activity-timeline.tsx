'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ActivityEntry,
  ActivityItem,
  ActivityGroup,
  ActivityCursorResult,
  ActivityFilter,
} from '@/features/activity/activityTypes';
import {
  CirclePlus,
  PencilLine,
  UserCheck,
  UserX,
  Ban,
  CircleCheckBig,
  Trash2,
  Flag,
  CheckCircle2,
  FlagTriangleRight,
  MailPlus,
  UserPlus,
  UserMinus,
  Shield,
  Rocket,
  Settings,
  Archive,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  CirclePlus,
  PencilLine,
  UserCheck,
  UserX,
  Ban,
  CircleCheckBig,
  Trash2,
  Flag,
  CheckCircle2,
  FlagTriangleRight,
  MailPlus,
  UserPlus,
  UserMinus,
  Shield,
  Rocket,
  Settings,
  Archive,
};

const IMPORTANCE_COLORS: Record<string, string> = {
  LOW: 'text-muted',
  NORMAL: 'text-fg',
  HIGH: 'text-accent',
  CRITICAL: 'text-red-400',
};

function ActivityIcon({ icon, importance }: { icon: string; importance: string }) {
  const Icon = ICON_MAP[icon];
  if (!Icon) return null;
  return (
    <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center ${IMPORTANCE_COLORS[importance]}`}>
      <Icon size={14} />
    </div>
  );
}

function ActorAvatar({ actor }: { actor: { name: string; avatar_url: string | null } }) {
  if (actor.avatar_url) {
    return (
      <img
        src={actor.avatar_url}
        alt={actor.name}
        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-surface-alt flex items-center justify-center text-xs text-muted flex-shrink-0">
      {actor.name.charAt(0).toUpperCase()}
    </div>
  );
}

function Timestamp({ ts }: { ts: string }) {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  let label: string;
  if (diffMin < 1) label = 'just now';
  else if (diffMin < 60) label = `${diffMin}m ago`;
  else if (diffMin < 1440) label = `${Math.floor(diffMin / 60)}h ago`;
  else label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return <span className="text-xs text-muted flex-shrink-0">{label}</span>;
}

function ActivityItemRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-start gap-3 py-2 group">
      <ActorAvatar actor={item.actor} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-fg truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-muted mt-0.5">{item.subtitle}</p>
        )}
      </div>
      <Timestamp ts={item.timestamp} />
    </div>
  );
}

function ActivityGroupRow({ group }: { group: ActivityGroup }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-start gap-3 py-2 w-full text-left group"
      >
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <ActorAvatar actor={group.actor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-fg truncate">{group.title}</p>
          <p className="text-xs text-muted mt-0.5">{group.count} events</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Timestamp ts={group.timestamp} />
          {expanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
        </div>
      </button>
      {expanded && (
        <div className="ml-9 pl-4 border-l border-border">
          {group.items.map((item) => (
            <ActivityItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityEntryRow({ entry }: { entry: ActivityEntry }) {
  if (entry.type === 'group') {
    return <ActivityGroupRow group={entry} />;
  }
  return <ActivityItemRow item={entry} />;
}

export function ActivityTimeline({
  questId,
  initial,
}: {
  questId: string;
  initial: ActivityCursorResult;
}) {
  const [entries, setEntries] = useState<ActivityEntry[]>(initial.items);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [newEventCount, setNewEventCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { realtimeBus } = await import('@/features/realtime/realtimeBus');
      const unsub = realtimeBus.subscribe(`quest:${questId}`, () => {
        if (!mounted) return;
        setNewEventCount((c) => c + 1);
      });
      return () => unsub();
    })();
    return () => { mounted = false; };
  }, [questId]);

  useEffect(() => {
    if (newEventCount === 0) return;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ limit: '5' });
        if (filter !== 'all') params.set('type', filter);
        const res = await fetch(`/api/quests/${questId}/activity?${params}`);
        if (!res.ok) return;
        const data: ActivityCursorResult = await res.json();
        setEntries((prev) => {
          const existingIds = new Set(prev.map((e) => e.type === 'item' ? (e as ActivityItem).id : (e as ActivityGroup).id));
          const newItems = data.items.filter((e) => !existingIds.has(e.type === 'item' ? (e as ActivityItem).id : (e as ActivityGroup).id));
          if (newItems.length === 0) return prev;
          return [...newItems, ...prev];
        });
      } catch {
        // Activity refresh failed silently
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [newEventCount, questId, filter]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !cursor) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20', cursor });
      if (filter !== 'all') params.set('type', filter);
      const res = await fetch(`/api/quests/${questId}/activity?${params}`);
      if (!res.ok) return;
      const data: ActivityCursorResult = await res.json();
      setEntries((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      // Load more failed silently
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, cursor, questId, filter]);

  const handleFilterChange = async (newFilter: ActivityFilter) => {
    setFilter(newFilter);
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (newFilter !== 'all') params.set('type', newFilter);
      const res = await fetch(`/api/quests/${questId}/activity?${params}`);
      if (!res.ok) return;
      const data: ActivityCursorResult = await res.json();
      setEntries(data.items);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      // Filter change failed silently
    } finally {
      setLoading(false);
    }
  };

  if (entries.length === 0 && !loading) {
    return (
      <div className="rounded-xl bg-surface border border-border p-6 sm:p-12 text-center" aria-live="polite">
        <p className="text-muted text-sm font-secondary tracking-wider uppercase">
          No activity yet
        </p>
        <p className="text-muted/60 text-xs mt-2 leading-relaxed max-w-sm mx-auto">
          Activity from every milestone update, action claim, and team event will appear here as your quest progresses.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 sm:mb-6">
        {(['all', 'actions', 'milestones', 'members'] as const).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filter === f
                ? 'bg-accent text-accent-fg'
                : 'bg-surface-alt text-muted hover:text-fg'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="divide-y divide-border">
        {entries.map((entry, i) => (
          <ActivityEntryRow key={entry.type === 'group' ? entry.id : (entry as ActivityItem).id} entry={entry} />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="mt-4 sm:mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="text-xs text-muted hover:text-fg transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
