import { activityRepository } from './activityRepository';
import { projectEvent, groupItems } from './activityProjection';
import type { ActivityCursorResult, ActivityFilter } from './activityTypes';

export async function getQuestActivityService(
  questId: string,
  options: {
    limit?: number;
    cursor?: string | null;
    type?: ActivityFilter;
  }
): Promise<ActivityCursorResult> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const filter = options.type ?? 'all';

  const { events, hasMore } = await activityRepository.getQuestActivity(questId, {
    limit,
    cursor: options.cursor ?? null,
    filter,
  });

  const projected = events
    .map(projectEvent)
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const entries = groupItems(projected);

  const nextCursor = entries.length > 0 && hasMore
    ? entries[entries.length - 1].timestamp
    : null;

  return {
    items: entries,
    nextCursor,
    hasMore,
  };
}
