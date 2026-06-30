import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { calculateQuestMomentum } from '@/features/momentum/calculateMomentum';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ questId: string }> },
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
    .select('id')
    .eq('quest_id', questId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const response = await calculateQuestMomentum(questId);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Momentum calculation failed:', error);
    return NextResponse.json(
      { error: 'Failed to calculate momentum' },
      { status: 500 },
    );
  }
}
