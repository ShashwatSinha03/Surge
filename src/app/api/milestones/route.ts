import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { createMilestoneSchema } from '@/features/milestones/schemas';
import { getCallerMembership, canManageMilestones } from '@/lib/permissions/quest';
import { createMilestoneService } from '@/features/milestones/services/createMilestone';

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

  const membership = await getCallerMembership(quest_id, clerkUserId);
  if (!membership || !canManageMilestones(membership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await createMilestoneService({
    quest_id,
    title,
    actorId: user.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.entity, { status: 201 });
}
