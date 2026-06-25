import { createServerClient } from '@/lib/supabase/server';
import type { SearchProvider, QuestResult, CommandContext } from '@/features/commands/types';

export const questSearchProvider: SearchProvider = {
  search: async (query: string, ctx: CommandContext): Promise<QuestResult[]> => {
    if (!ctx.userId) return [];

    const supabase = createServerClient();

    const { data: memberships } = await supabase
      .from('quest_members')
      .select('quest_id')
      .eq('user_id', ctx.userId);

    if (!memberships || memberships.length === 0) return [];

    const questIds = memberships.map((m) => m.quest_id);

    const { data } = await supabase
      .from('quests')
      .select('id, title, status, template_type')
      .in('id', questIds)
      .ilike('title', `%${query}%`)
      .neq('status', 'deleted')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (!data) return [];

    return data.map((q) => ({
      type: 'quest' as const,
      id: q.id,
      title: q.title,
      status: q.status,
      templateType: q.template_type,
    }));
  },
};
