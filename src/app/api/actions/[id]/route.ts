import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { updateActionSchema } from '@/features/actions/schemas';
import { getCallerMembership, canDeleteAction } from '@/lib/permissions/quest';
import { deleteActionService } from '@/features/actions/services/deleteAction';

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
  const parsed = updateActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: action } = await supabase
    .from('actions')
    .select('*')
    .eq('id', id)
    .single();
  if (!action) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const membership = await getCallerMembership(action.quest_id, clerkUserId);
  if (!membership) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (parsed.data.title) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;

  const { data: updated } = await supabase
    .from('actions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

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

  const supabase = createServerClient();

  const { data: action } = await supabase
    .from('actions')
    .select('*')
    .eq('id', id)
    .single();
  if (!action) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const membership = await getCallerMembership(action.quest_id, clerkUserId);
  if (!membership || !canDeleteAction(membership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  const result = await deleteActionService({
    actionId: id,
    actorId: user!.id,
    questId: action.quest_id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ message: 'Action deleted.' }, { status: 200 });
}
