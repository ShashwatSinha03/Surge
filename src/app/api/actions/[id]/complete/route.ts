import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCallerMembership } from '@/lib/permissions/quest';
import { canTransition } from '@/lib/execution/state-machine';
import { completeActionService } from '@/features/actions/services/completeAction';

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
  if (!action) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const membership = await getCallerMembership(action.quest_id, clerkUserId);
  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!canTransition(action.status, 'completed')) {
    return NextResponse.json(
      { error: `Cannot complete action from ${action.status}.` },
      { status: 422 }
    );
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  const result = await completeActionService({
    actionId: id,
    actorId: user!.id,
    questId: action.quest_id,
    milestoneId: action.milestone_id,
  });

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 403 });

  return NextResponse.json({ message: 'Action completed.' });
}
