import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { updateMilestoneSchema, deleteMilestoneSchema } from '@/features/milestones/schemas';
import { getCallerMembership, canManageMilestones, canDeleteMilestones } from '@/lib/permissions/quest';
import { normalizePositions } from '@/lib/execution/state-machine';

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

  if (!milestone) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const membership = await getCallerMembership(milestone.quest_id, clerkUserId);
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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

  if (!milestone) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const membership = await getCallerMembership(milestone.quest_id, clerkUserId);
  if (!membership || !canManageMilestones(membership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.title) updates.title = parsed.data.title;

  if (parsed.data.position !== undefined) {
    updates.position = parsed.data.position;
  }

  const { data: updated, error } = await supabase
    .from('milestones')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update milestone.' }, { status: 500 });
  }

  if (parsed.data.position !== undefined) {
    const { data: siblings } = await supabase
      .from('milestones')
      .select('id, position')
      .eq('quest_id', milestone.quest_id)
      .order('position', { ascending: true });

    if (siblings) {
      const normalized = normalizePositions(siblings);
      for (const item of normalized) {
        await supabase
          .from('milestones')
          .update({ position: item.position })
          .eq('id', item.id);
      }
    }
  }

  return NextResponse.json(updated);
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
    if (parsed.success && parsed.data.force) {
      force = true;
    }
  } catch {
    // no body, no force flag
  }

  const supabase = createServerClient();

  const { data: milestone } = await supabase
    .from('milestones')
    .select('*')
    .eq('id', id)
    .single();

  if (!milestone) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const membership = await getCallerMembership(milestone.quest_id, clerkUserId);
  if (!membership || !canDeleteMilestones(membership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { count } = await supabase
    .from('actions')
    .select('*', { count: 'exact', head: true })
    .eq('milestone_id', id);

  if (count && count > 0 && !force) {
    return NextResponse.json(
      {
        error: 'Milestone contains actions. Set force: true to confirm deletion.',
        actions_remaining: count,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.from('milestones').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete milestone.' }, { status: 500 });
  }

  const { data: siblings } = await supabase
    .from('milestones')
    .select('id, position')
    .eq('quest_id', milestone.quest_id)
    .order('position', { ascending: true });

  if (siblings) {
    const normalized = normalizePositions(siblings);
    for (const item of normalized) {
      await supabase
        .from('milestones')
        .update({ position: item.position })
        .eq('id', item.id);
    }
  }

  return NextResponse.json({ message: 'Milestone deleted.' });
}
