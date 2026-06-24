import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { createActionSchema } from '@/features/actions/schemas';
import { getCallerMembership } from '@/lib/permissions/quest';
import { calculateMilestoneStatus } from '@/lib/execution/state-machine';

export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { quest_id, milestone_id, title, description } = parsed.data;

  const supabase = createServerClient();

  const membership = await getCallerMembership(quest_id, clerkUserId);
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: action, error } = await supabase
    .from('actions')
    .insert({
      quest_id,
      milestone_id,
      title,
      description: description ?? null,
      status: 'open',
      owner_id: null,
      created_by: membership.userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create action.' }, { status: 500 });
  }

  return NextResponse.json(action, { status: 201 });
}
