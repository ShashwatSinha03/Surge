import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCallerMembership } from '@/lib/permissions/quest';
import type { MemberWithUser } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { questId } = await params;

  const supabase = createServerClient();

  const membership = await getCallerMembership(questId, clerkUserId);
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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

  if (!members) {
    return NextResponse.json({ members: [] });
  }

  const result: MemberWithUser[] = members.map((m: any) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    name: m.users.name,
    email: m.users.email,
    avatar_url: m.users.avatar_url,
  }));

  return NextResponse.json({ members: result });
}
