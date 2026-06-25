import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCallerMembership } from '@/lib/permissions/quest';
import { getQuestActivityService } from '@/features/activity/activityService';
import type { ActivityFilter } from '@/features/activity/activityTypes';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { questId } = await params;

  const membership = await getCallerMembership(questId, userId);
  if (!membership) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const cursor = searchParams.get('cursor');
  const type = (searchParams.get('type') as ActivityFilter) ?? 'all';

  const result = await getQuestActivityService(questId, { limit, cursor, type });

  return NextResponse.json(result);
}
