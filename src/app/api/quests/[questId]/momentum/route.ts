import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { extractSignalsWithPrev } from '@/features/momentum/signals';
import { analyzeBehavior } from '@/features/momentum/behavior';
import { evaluatePillars } from '@/features/momentum/pillars';
import { calculateMomentum } from '@/features/momentum/calculator';
import { generateRecommendations } from '@/features/momentum/recommendations';
import { generateMissionSummary, generateHighlights } from '@/features/momentum/summary';
import type { MomentumResponse } from '@/features/momentum/types';

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
    const { current: signals, prev: prevSignals } = await extractSignalsWithPrev(questId);
    const behavior = await analyzeBehavior(signals);
    const pillars = evaluatePillars(signals, behavior, prevSignals);
    const momentum = calculateMomentum(pillars);
    const recommendations = generateRecommendations(signals, behavior);
    const mission = generateMissionSummary(momentum.overall, pillars);
    const highlights = generateHighlights(signals);

    const response: MomentumResponse = {
      mission,
      momentum,
      highlights,
      pillars,
      recommendations,
      lastCalculated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Momentum calculation failed:', error);
    return NextResponse.json(
      { error: 'Failed to calculate momentum' },
      { status: 500 },
    );
  }
}
