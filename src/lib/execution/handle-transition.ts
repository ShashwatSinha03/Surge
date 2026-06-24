import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCallerMembership } from '@/lib/permissions/quest';
import { canTransition, calculateMilestoneStatus } from '@/lib/execution/state-machine';
import type { ActionStatus } from '@/types';

export async function handleActionTransition(
  req: Request,
  params: { id: string },
  targetStatus: ActionStatus,
  extraChecks?: (action: any, userId: string) => string | null
): Promise<Response> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const supabase = createServerClient();

  const { data: action } = await supabase
    .from('actions')
    .select('*')
    .eq('id', id)
    .single();

  if (!action) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const membership = await getCallerMembership(action.quest_id, clerkUserId);
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!canTransition(action.status, targetStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${action.status} to ${targetStatus}.` },
      { status: 422 }
    );
  }

  if (extraChecks) {
    const violation = extraChecks(action, membership.userId);
    if (violation) {
      return NextResponse.json({ error: violation }, { status: 403 });
    }
  }

  const updates: Record<string, unknown> = { status: targetStatus };

  if (targetStatus === 'claimed') {
    updates.owner_id = membership.userId;
  }
  if (targetStatus === 'open') {
    updates.owner_id = null;
  }

  const { error } = await supabase
    .from('actions')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update action.' }, { status: 500 });
  }

  const { data: milestoneActions } = await supabase
    .from('actions')
    .select('status')
    .eq('milestone_id', action.milestone_id);

  const totalActions = milestoneActions?.length ?? 0;
  const completedCount = milestoneActions?.filter((a) => a.status === 'completed').length ?? 0;
  const newStatus = calculateMilestoneStatus(totalActions, completedCount);

  await supabase
    .from('milestones')
    .update({ status: newStatus })
    .eq('id', action.milestone_id);

  return NextResponse.json({ message: `Action ${targetStatus}.` });
}
