import { createServerClient } from '@/lib/supabase/server';
import type { SearchProvider, MilestoneResult, CommandContext } from '@/features/commands/types';

export const milestoneSearchProvider: SearchProvider = {
  search: async (query: string, ctx: CommandContext): Promise<MilestoneResult[]> => {
    if (!ctx.questId) return [];

    const supabase = createServerClient();

    const { data } = await supabase
      .from('milestones')
      .select('id, title, status')
      .eq('quest_id', ctx.questId)
      .ilike('title', `%${query}%`)
      .order('position', { ascending: true })
      .limit(5);

    if (!data) return [];

    return data.map((m) => ({
      type: 'milestone' as const,
      id: m.id,
      title: m.title,
      status: m.status,
      questId: ctx.questId!,
    }));
  },
};
