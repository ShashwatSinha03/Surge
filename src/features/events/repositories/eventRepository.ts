import { createServerClient } from '@/lib/supabase/server';

export const eventRepository = {
  async getRecentEvents(questId: string, limit = 20) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('quest_id', questId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  },
};
