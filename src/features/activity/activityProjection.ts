import type { RawEventRow, ActivityItem, ActivityGroup, ActivityEntry, ActivityActor } from './activityTypes';
import { getRegistryEntry } from './activityRegistry';

const GROUP_TIME_WINDOW_MS = 5 * 60 * 1000;

function resolveActor(event: RawEventRow): ActivityActor {
  const actor = event.metadata?.actor;
  if (actor && actor.name) {
    return { name: actor.name, avatar_url: actor.avatar_url ?? null };
  }
  return { name: 'Unknown', avatar_url: null };
}

export function projectEvent(event: RawEventRow): ActivityItem | null {
  const entry = getRegistryEntry(event.event_type);
  if (!entry) return null;

  const actor = resolveActor(event);
  const formatted = entry.format(event, actor);

  return {
    type: 'item',
    id: event.id,
    title: formatted.title,
    subtitle: formatted.subtitle,
    actor,
    icon: entry.icon,
    importance: entry.importance,
    timestamp: event.created_at,
  };
}

export function groupItems(items: ActivityItem[]): ActivityEntry[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const result: ActivityEntry[] = [];
  let currentGroup: ActivityItem[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevTime = new Date(prev.timestamp).getTime();
    const currTime = new Date(curr.timestamp).getTime();
    const gapMs = prevTime - currTime;
    const sameGroup = curr.actor.name === currentGroup[0].actor.name && gapMs <= GROUP_TIME_WINDOW_MS;

    if (sameGroup) {
      currentGroup.push(curr);
    } else {
      result.push(finalizeGroup(currentGroup));
      currentGroup = [curr];
    }
  }
  result.push(finalizeGroup(currentGroup));

  return result;
}

function finalizeGroup(items: ActivityItem[]): ActivityEntry {
  if (items.length === 1) return items[0];

  const first = items[0];
  const template = first.title.replace(first.actor.name, '').trim();
  const count = items.length;

  return {
    type: 'group',
    id: `group:${first.id}`,
    title: `${first.actor.name} did ${count} ${template}`,
    actor: first.actor,
    icon: first.icon,
    importance: first.importance,
    timestamp: first.timestamp,
    count,
    items,
  };
}

export function filterEventsByCategory(events: RawEventRow[], category: string): RawEventRow[] {
  if (category === 'all') return events;
  return events.filter((event) => {
    const entry = getRegistryEntry(event.event_type);
    return entry?.category === category;
  });
}
