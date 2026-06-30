import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { MissionControlClient } from './mission-control-client';
import { calculateQuestMomentum } from '@/features/momentum/calculateMomentum';

type Props = {
  params: Promise<{ questId: string }>;
};

export const dynamic = 'force-dynamic';

export default async function MissionControlPage({ params }: Props) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const { questId } = await params;

  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string }>();

  if (!user) return null;

  const { data: membership } = await supabase
    .from('quest_members')
    .select('id')
    .eq('quest_id', questId)
    .eq('user_id', user.id)
    .single();

  if (!membership) notFound();

  try {
    const data = await calculateQuestMomentum(questId);
    return <MissionControlClient data={data} />;
  } catch {
    return (
      <div className="py-12 text-center">
        <p className="text-muted">Unable to load mission data.</p>
      </div>
    );
  }
}
