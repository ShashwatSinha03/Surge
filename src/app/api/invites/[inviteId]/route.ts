import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCallerMembership, canManageInvites } from '@/lib/permissions/quest';
import { revokeInviteService } from '@/features/invites/services/revokeInvite';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { inviteId } = await params;

  const supabase = createServerClient();
  const { data: invite } = await supabase
    .from('invites')
    .select('quest_id')
    .eq('id', inviteId)
    .single();
  if (!invite) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const membership = await getCallerMembership(invite.quest_id, clerkUserId);
  if (!membership || !canManageInvites(membership.role)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await revokeInviteService({
    inviteId,
    actorId: user.id,
    questId: invite.quest_id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ message: 'Invite revoked.' });
}
