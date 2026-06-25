import { createServerClient } from '@/lib/supabase/server';
import type { SearchProvider, MemberResult, CommandContext } from '@/features/commands/types';

export const memberSearchProvider: SearchProvider = {
  search: async (query: string, ctx: CommandContext): Promise<MemberResult[]> => {
    if (!ctx.questId) return [];

    const supabase = createServerClient();

    const { data: members } = await supabase
      .from('quest_members')
      .select(`
        id,
        role,
        users!inner (
          id,
          name,
          email
        )
      `)
      .eq('quest_id', ctx.questId);

    if (!members) return [];

    const q = query.toLowerCase();

    const matching = (members as any[]).filter((m: any) => {
      const name = (m.users?.name ?? '').toLowerCase();
      const email = (m.users?.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });

    return matching.slice(0, 5).map((m: any) => ({
      type: 'member' as const,
      id: m.id,
      name: m.users.name,
      email: m.users.email,
      role: m.role,
      questId: ctx.questId!,
    }));
  },
};
