import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { getQuestActivityService } from '@/features/activity/activityService';
import { ActivityTimeline } from './activity-timeline';

type Props = {
  params: Promise<{ questId: string }>;
};

export const dynamic = 'force-dynamic';

export default async function ActivityPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) return null;

  const { questId } = await params;

  const supabase = createServerClient();

  const { data: quest } = await supabase
    .from('quests')
    .select('title')
    .eq('id', questId)
    .neq('status', 'deleted')
    .single<{ title: string }>();

  if (!quest) {
    notFound();
  }

  const initial = await getQuestActivityService(questId, { limit: 20 });

  return (
    <ActivityTimeline questId={questId} initial={initial} />
  );
}
