import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCallerMembership, canManageInvites, canChangeRoles, canRemoveMember } from '@/lib/permissions/quest';
import { TeamContent } from './team-content';
import type { MemberWithUser } from '@/types';

type Props = {
  params: Promise<{ questId: string }>;
};

export const dynamic = 'force-dynamic';

export default async function TeamPage({ params }: Props) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const { questId } = await params;

  const supabase = createServerClient();

  const membership = await getCallerMembership(questId, clerkUserId);
  if (!membership) return null;

  const { data: members } = await supabase
    .from('quest_members')
    .select(`
      id,
      user_id,
      role,
      joined_at,
      users!inner (
        name,
        email,
        avatar_url
      )
    `)
    .eq('quest_id', questId)
    .order('joined_at', { ascending: true });

  const memberList: MemberWithUser[] = (members ?? []).map((m: any) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    name: m.users.name,
    email: m.users.email,
    avatar_url: m.users.avatar_url,
  }));

  const sorted = [...memberList].sort((a, b) => {
    const order = { owner: 0, admin: 1, member: 2 };
    return order[a.role] - order[b.role];
  });

  const { data: pendingInvites } = await supabase
    .from('invites')
    .select('id, email, expires_at')
    .eq('quest_id', questId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .is('declined_at', null)
    .gt('expires_at', new Date().toISOString());

  return (
    <TeamContent
      questId={questId}
      members={sorted}
      pendingInvites={pendingInvites ?? []}
      currentUserRole={membership.role}
      canInvite={canManageInvites(membership.role)}
      canChangeRoles={canChangeRoles(membership.role)}
      canRemove={canRemoveMember(membership.role)}
    />
  );
}
