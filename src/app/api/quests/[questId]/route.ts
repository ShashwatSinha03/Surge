import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { deleteQuestService } from '@/features/quests/services/deleteQuest';
import type { MemberRole } from '@/types';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { questId } = await params;

  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('quest_members')
    .select('role')
    .eq('quest_id', questId)
    .eq('user_id', user.id)
    .single<{ role: MemberRole }>();

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return NextResponse.json({ error: 'Only owners and admins can delete quests' }, { status: 403 });
  }

  const result = await deleteQuestService({ questId, actorId: user.id });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
