import { createServerClient } from '@/lib/supabase/server';
import type { RawEventRow, ActivityFilter } from './activityTypes';
import { getRegistryEntry } from './activityRegistry';

export const activityRepository = {
  async getQuestActivity(
    questId: string,
    options: {
      limit: number;
      cursor?: string | null;
      filter: ActivityFilter;
    }
  ): Promise<{ events: RawEventRow[]; hasMore: boolean }> {
    const supabase = createServerClient();

    const fetchLimit = options.limit + 1;

    let query = supabase
      .from('events')
      .select('*')
      .eq('quest_id', questId)
      .order('created_at', { ascending: false })
      .limit(fetchLimit);

    if (options.cursor) {
      query = query.lt('created_at', options.cursor);
    }

    const { data } = await query;

    if (!data || data.length === 0) {
      return { events: [], hasMore: false };
    }

    const hasMore = data.length > options.limit;
    const events = (hasMore ? data.slice(0, options.limit) : data) as unknown as RawEventRow[];

    if (options.filter === 'all') return { events, hasMore };

    const filtered = events.filter((event) => {
      const entry = getRegistryEntry(event.event_type);
      return entry?.category === options.filter;
    });

    if (filtered.length === 0 && hasMore) {
      return this.getQuestActivity(questId, { ...options, cursor: events[events.length - 1].created_at });
    }

    return { events: filtered, hasMore };
  },
};
