import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCallerMembership } from '@/lib/permissions/quest';
import { JourneyBoard } from './journey-board';
import { canManageMilestones, canDeleteMilestones, canDeleteAction } from '@/lib/permissions/quest';
import type { Milestone, Action, MilestoneWithActions } from '@/types';

type Props = {
  params: Promise<{ questId: string }>;
};

export const dynamic = 'force-dynamic';

export default async function MilestonesPage({ params }: Props) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const { questId } = await params;

  const supabase = createServerClient();

  const membership = await getCallerMembership(questId, clerkUserId);
  if (!membership) return null;

  const { data: milestones } = await supabase
    .from('milestones')
    .select('*')
    .eq('quest_id', questId)
    .order('position', { ascending: true });

  const milestoneIds = (milestones ?? []).map((m) => m.id);

  let actionsMap: Record<string, any[]> = {};
  let ownerIds: string[] = [];

  if (milestoneIds.length > 0) {
    const { data: actions } = await supabase
      .from('actions')
      .select('*')
      .in('milestone_id', milestoneIds)
      .order('created_at', { ascending: true });

    if (actions) {
      for (const action of actions) {
        if (!actionsMap[action.milestone_id]) {
          actionsMap[action.milestone_id] = [];
        }
        actionsMap[action.milestone_id].push(action);
        if (action.owner_id) {
          ownerIds.push(action.owner_id);
        }
      }
    }
  }

  let ownerNames: Record<string, { name: string; avatar_url: string | null }> = {};
  if (ownerIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .in('id', [...new Set(ownerIds)]);

    if (users) {
      for (const u of users) {
        ownerNames[u.id] = { name: u.name, avatar_url: u.avatar_url };
      }
    }
  }

  const boardData: MilestoneWithActions[] = (milestones ?? []).map((m) => ({
    ...m,
    actions: ((actionsMap[m.id] ?? []) as Action[]).map((a) => ({
      ...a,
      owner_name: a.owner_id ? (ownerNames[a.owner_id]?.name ?? null) : null,
      owner_avatar: a.owner_id ? (ownerNames[a.owner_id]?.avatar_url ?? null) : null,
    })),
  }));

  const allActions = boardData.flatMap((m) => m.actions);
  const totalActions = allActions.length;
  const completedActions = allActions.filter((a) => a.status === 'completed').length;
  const claimedActions = allActions.filter((a) => a.status === 'claimed').length;
  const blockedActions = allActions.filter((a) => a.status === 'blocked').length;

  return (
    <JourneyBoard
      questId={questId}
      milestones={boardData}
      currentUserId={membership.userId}
      currentUserRole={membership.role}
      canCreateMilestone={canManageMilestones(membership.role)}
      canDeleteMilestone={canDeleteMilestones(membership.role)}
      canDeleteAction={canDeleteAction(membership.role)}
      canManageMilestones={canManageMilestones(membership.role)}
      stats={{ total: totalActions, completed: completedActions, claimed: claimedActions, blocked: blockedActions }}
    />
  );
}
