import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCallerMembership, canUnclaimAnyAction } from '@/lib/permissions/quest';
import { canTransition, calculateMilestoneStatus } from '@/lib/execution/state-machine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

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

  if (!canTransition(action.status, 'open')) {
    return NextResponse.json(
      { error: `Cannot unclaim from ${action.status}.` },
      { status: 422 }
    );
  }

  const isOwner = action.owner_id === membership.userId;
  const isAuthorized = canUnclaimAnyAction(membership.role);

  if (!isOwner && !isAuthorized) {
    return NextResponse.json(
      { error: 'Only the action owner or an admin can unclaim.' },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from('actions')
    .update({ status: 'open', owner_id: null })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to unclaim action.' }, { status: 500 });
  }

  const { data: milestoneActions } = await supabase
    .from('actions')
    .select('status')
    .eq('milestone_id', action.milestone_id);

  const totalActions = milestoneActions?.length ?? 0;
  const completedCount = milestoneActions?.filter((a) => a.status === 'completed').length ?? 0;
  const newStatus = (totalActions > 0 && totalActions === completedCount) ? 'completed' as const : 'open' as const;

  await supabase
    .from('milestones')
    .update({ status: newStatus })
    .eq('id', action.milestone_id);

  return NextResponse.json({ message: 'Action unclaimed.' });
}
