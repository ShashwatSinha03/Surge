import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { createMilestoneSchema } from '@/features/milestones/schemas';
import { getCallerMembership, canManageMilestones } from '@/lib/permissions/quest';
import { normalizePositions } from '@/lib/execution/state-machine';

export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createMilestoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const { quest_id, title } = parsed.data;

  const supabase = createServerClient();

  const membership = await getCallerMembership(quest_id, clerkUserId);
  if (!membership || !canManageMilestones(membership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: maxPos } = await supabase
    .from('milestones')
    .select('position')
    .eq('quest_id', quest_id)
    .order('position', { ascending: false })
    .limit(1)
    .single<{ position: number }>();

  const nextPosition = (maxPos?.position ?? 0) + 1;

  const { data: milestone, error } = await supabase
    .from('milestones')
    .insert({
      quest_id,
      title,
      position: nextPosition,
      created_by: membership.userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create milestone.' }, { status: 500 });
  }

  return NextResponse.json(milestone, { status: 201 });
}
