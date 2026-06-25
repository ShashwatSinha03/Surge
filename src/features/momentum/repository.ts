import { createServerClient } from '@/lib/supabase/server';

export const momentumRepository = {
  async getQuest(questId: string) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('quests')
      .select('id, title, status, created_at')
      .eq('id', questId)
      .single();
    return data;
  },

  async getActions(questId: string) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('actions')
      .select('id, title, status, owner_id, milestone_id, created_at')
      .eq('quest_id', questId);
    return data ?? [];
  },

  async getMilestones(questId: string) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('milestones')
      .select('id, title, status, created_at')
      .eq('quest_id', questId);
    return data ?? [];
  },

  async getMembers(questId: string) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('quest_members')
      .select('user_id, role')
      .eq('quest_id', questId);
    return data ?? [];
  },

  async getEvents(questId: string, sinceDays?: number) {
    const supabase = createServerClient();
    let query = supabase
      .from('events')
      .select('id, event_type, actor_id, created_at')
      .eq('quest_id', questId)
      .order('created_at', { ascending: false });

    if (sinceDays !== undefined) {
      const since = new Date();
      since.setDate(since.getDate() - sinceDays);
      query = query.gte('created_at', since.toISOString());
    }

    const { data } = await query;
    return data ?? [];
  },

  async getActionIdMap(questId: string) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('actions')
      .select('id, title')
      .eq('quest_id', questId);
    return new Map((data ?? []).map((a) => [a.id, a.title]));
  },

  async getMilestoneIdMap(questId: string) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('milestones')
      .select('id, title')
      .eq('quest_id', questId);
    return new Map((data ?? []).map((m) => [m.id, m.title]));
  },

  async getMilestoneActionCounts(questId: string) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('milestones')
      .select('id, title, status')
      .eq('quest_id', questId);
    return data ?? [];
  },

  async getActionMilestoneMap(questId: string) {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('actions')
      .select('id, milestone_id, title')
      .eq('quest_id', questId);
    const msMap = new Map<string, { title: string }>();
    const msQuery = await supabase
      .from('milestones')
      .select('id, title')
      .eq('quest_id', questId);
    for (const ms of msQuery.data ?? []) {
      msMap.set(ms.id, ms);
    }
    const actionMsMap = new Map<string, string>();
    for (const a of data ?? []) {
      const ms = msMap.get(a.milestone_id);
      actionMsMap.set(a.id, ms?.title ?? 'Unknown');
    }
    return { actionMilestone: actionMsMap, milestones: msMap };
  },
};
