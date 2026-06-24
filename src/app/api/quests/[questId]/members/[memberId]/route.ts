import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { updateMemberRoleSchema } from '@/features/members/schemas';
import {
  getCallerMembership,
  canChangeRoles,
  canRemoveMember,
  isValidRoleTransition,
} from '@/lib/permissions/quest';
import type { MemberRole } from '@/types';

async function getTargetMember(memberId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('quest_members')
    .select('id, quest_id, user_id, role')
    .eq('id', memberId)
    .single<{ id: string; quest_id: string; user_id: string; role: MemberRole }>();
  return data;
}

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

  const supabase = createServerClient();

  const callerMembership = await getCallerMembership(questId, clerkUserId);
  if (!callerMembership || !canChangeRoles(callerMembership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const target = await getTargetMember(memberId);
  if (!target || target.quest_id !== questId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (target.role === 'owner') {
    return NextResponse.json(
      { error: 'Cannot change the owner role.' },
      { status: 403 }
    );
  }

  if (!isValidRoleTransition(target.role, parsed.data.role)) {
    return NextResponse.json(
      { error: 'Invalid role transition.' },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from('quest_members')
    .update({ role: parsed.data.role })
    .eq('id', memberId);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to update role.' },
      { status: 500 }
    );
  }

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

  const supabase = createServerClient();

  const callerMembership = await getCallerMembership(questId, clerkUserId);
  if (!callerMembership || !canRemoveMember(callerMembership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const target = await getTargetMember(memberId);
  if (!target || target.quest_id !== questId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (target.role === 'owner') {
    return NextResponse.json(
      { error: 'Cannot remove the owner.' },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from('quest_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to remove member.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'Member removed.' });
}
