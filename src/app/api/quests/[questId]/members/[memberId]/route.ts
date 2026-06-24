import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCallerMembership } from '@/lib/permissions/quest';
import { updateMemberRoleSchema } from '@/features/members/schemas';
import { canChangeRoles, isValidRoleTransition } from '@/lib/permissions/quest';
import { updateMemberRoleService } from '@/features/members/services/updateRole';
import type { MemberRole } from '@/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ questId: string; memberId: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { questId, memberId } = await params;
  const body = await req.json();
  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 400 });
  }

  const membership = await getCallerMembership(questId, clerkUserId);
  if (!membership || !canChangeRoles(membership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = createServerClient();
  const { data: target } = await supabase
    .from('quest_members')
    .select('*')
    .eq('id', memberId)
    .single();
  if (!target || target.quest_id !== questId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Cannot change the owner role.' }, { status: 403 });
  }
  if (!isValidRoleTransition(target.role, parsed.data.role)) {
    return NextResponse.json({ error: 'Invalid role transition.' }, { status: 403 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  const result = await updateMemberRoleService({
    memberId,
    actorId: user!.id,
    questId,
    newRole: parsed.data.role,
  });

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ message: 'Role updated.' });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ questId: string; memberId: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { questId, memberId } = await params;

  const membership = await getCallerMembership(questId, clerkUserId);
  if (!membership || !canChangeRoles(membership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = createServerClient();
  const { data: target } = await supabase
    .from('quest_members')
    .select('*')
    .eq('id', memberId)
    .single();
  if (!target || target.quest_id !== questId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove the owner.' }, { status: 403 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  const { removeMemberService } = await import('@/features/members/services/removeMember');
  const result = await removeMemberService({
    memberId,
    actorId: user!.id,
    questId,
  });

  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ message: 'Member removed.' });
}
