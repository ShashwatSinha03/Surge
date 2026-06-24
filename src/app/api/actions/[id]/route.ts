import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { updateActionSchema } from '@/features/actions/schemas';
import { getCallerMembership, canDeleteAction } from '@/lib/permissions/quest';

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

  if (!action) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const membership = await getCallerMembership(action.quest_id, clerkUserId);
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: updated, error } = await supabase
    .from('actions')
    .update({
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update action.' }, { status: 500 });
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
  if (!membership || !canDeleteAction(membership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { error } = await supabase.from('actions').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete action.' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Action deleted.' });
}
