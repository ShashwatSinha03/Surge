import { createServerClient } from '@/lib/supabase/server';
import type { SearchProvider, ActionResult, CommandContext } from '@/features/commands/types';

export const actionSearchProvider: SearchProvider = {
  search: async (query: string, ctx: CommandContext): Promise<ActionResult[]> => {
    if (!ctx.questId) return [];

    const supabase = createServerClient();

    const { data } = await supabase
      .from('actions')
      .select('id, title, status, milestone_id')
      .eq('quest_id', ctx.questId)
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!data) return [];

    const milestoneIds = [...new Set(data.map((a) => a.milestone_id))];

    const { data: milestones } = await supabase
      .from('milestones')
      .select('id, title')
      .in('id', milestoneIds);

    const milestoneMap = new Map(
      (milestones ?? []).map((m) => [m.id, m.title]),
    );

    return data.map((a) => ({
      type: 'action' as const,
      id: a.id,
      title: a.title,
      status: a.status,
      milestoneTitle: milestoneMap.get(a.milestone_id),
      questId: ctx.questId!,
    }));
  },
};
