import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { updateMilestoneSchema, deleteMilestoneSchema } from '@/features/milestones/schemas';
import { getCallerMembership, canManageMilestones, canDeleteMilestones } from '@/lib/permissions/quest';
import { updateMilestoneService } from '@/features/milestones/services/updateMilestone';
import { deleteMilestoneService } from '@/features/milestones/services/deleteMilestone';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServerClient();

  const { data: milestone } = await supabase
    .from('milestones')
    .select('*')
    .eq('id', id)
    .single();
  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const membership = await getCallerMembership(milestone.quest_id, clerkUserId);
  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(milestone);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateMilestoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: milestone } = await supabase
    .from('milestones')
    .select('*')
    .eq('id', id)
    .single();
  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const membership = await getCallerMembership(milestone.quest_id, clerkUserId);
  if (!membership || !canManageMilestones(membership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  const result = await updateMilestoneService({
    milestoneId: id,
    actorId: user!.id,
    questId: milestone.quest_id,
    title: parsed.data.title,
    position: parsed.data.position,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.entity);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let force = false;
  try {
    const body = await req.json();
    const parsed = deleteMilestoneSchema.safeParse(body);
    if (parsed.success && parsed.data.force) force = true;
  } catch {}

  const supabase = createServerClient();
  const { data: milestone } = await supabase
    .from('milestones')
    .select('*')
    .eq('id', id)
    .single();
  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const membership = await getCallerMembership(milestone.quest_id, clerkUserId);
  if (!membership || !canDeleteMilestones(membership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  const result = await deleteMilestoneService({
    milestoneId: id,
    actorId: user!.id,
    questId: milestone.quest_id,
    force,
  });

  if (!result.success) {
    if (result.error.includes('action(s)')) {
      const count = parseInt(result.error.match(/\d+/)?.[0] ?? '0', 10);
      return NextResponse.json(
        { error: result.error, actions_remaining: count },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ message: 'Milestone deleted.' });
}
