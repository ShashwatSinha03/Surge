import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { questId } = await params;
  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single<{ id: string }>();

  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from('quest_members')
    .select('id')
    .eq('quest_id', questId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: quest } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .single();

  if (!quest) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(quest);
}
