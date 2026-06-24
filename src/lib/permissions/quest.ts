import { createServerClient } from '@/lib/supabase/server';
import type { MemberRole } from '@/types';

type MembershipResult = {
  userId: string;
  memberId: string;
  role: MemberRole;
};

export async function getMemberRole(
  questId: string,
  clerkUserId: string
): Promise<MemberRole | null> {
  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  if (!user) return null;

  const { data: membership } = await supabase
    .from('quest_members')
    .select('role')
    .eq('quest_id', questId)
    .eq('user_id', user.id)
    .single<{ role: MemberRole }>();

  return membership?.role ?? null;
}

export async function getCallerMembership(
  questId: string,
  clerkUserId: string
): Promise<MembershipResult | null> {
  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  if (!user) return null;

  const { data: membership } = await supabase
    .from('quest_members')
    .select('id, role')
    .eq('quest_id', questId)
    .eq('user_id', user.id)
    .single<{ id: string; role: MemberRole }>();

  if (!membership) return null;

  return {
    userId: user.id,
    memberId: membership.id,
    role: membership.role,
  };
}

export function canManageInvites(role: MemberRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canChangeRoles(role: MemberRole): boolean {
  return role === 'owner';
}

export function canRemoveMember(role: MemberRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function isValidRoleTransition(
  currentRole: MemberRole,
  targetRole: MemberRole
): boolean {
  if (currentRole === targetRole) return true;
  if (currentRole === 'owner' || targetRole === 'owner') return false;
  return true;
}

export function canManageMilestones(role: MemberRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canDeleteMilestones(role: MemberRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canDeleteAction(role: MemberRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canUnclaimAnyAction(role: MemberRole): boolean {
  return role === 'owner' || role === 'admin';
}
