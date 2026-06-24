import { createServerClient } from '@/lib/supabase/server';

export const eventRepository = {
  async getQuestEvents(questId: string) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('quest_id', questId)
      .order('created_at', { ascending: false });
    return data ?? [];
  },

  async getEventsByEntity(entityType: string, entityId: string) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    return data ?? [];
  },

  async getEventsByActor(actorId: string) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('actor_id', actorId)
      .order('created_at', { ascending: false });
    return data ?? [];
  },

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
