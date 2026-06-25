import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { QuestTabs } from '@/features/quests/components/quest-tabs';
import { QuestLayoutClient } from './quest-layout-client';
import { Badge } from '@/components/ui/badge';
import type { Quest } from '@/types';

type Props = {
  children: React.ReactNode;
  params: Promise<{ questId: string }>;
};

export const dynamic = 'force-dynamic';

export default async function QuestLayout({ children, params }: Props) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const { questId } = await params;

  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('users')
    .select('id, name, avatar_url')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string; name: string; avatar_url: string | null }>();

  if (!user) return null;

  const { data: membership } = await supabase
    .from('quest_members')
    .select('id')
    .eq('quest_id', questId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    notFound();
  }

  const { data: quest } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .neq('status', 'deleted')
    .single<Quest>();

  if (!quest) {
    notFound();
  }

  return (
    <div className="p-8 max-w-4xl">
      <header className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-medium text-fg">{quest.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="status" color={quest.status === 'completed' ? 'completed' : quest.status === 'active' ? 'healthy' : 'open'}>
                {quest.status}
              </Badge>
              <span className="text-xs text-muted">
                {quest.template_type.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          <QuestLayoutClient
            questId={questId}
            userId={user.id}
            userName={user.name}
            userAvatar={user.avatar_url}
          >
            <div />
          </QuestLayoutClient>
        </div>
      </header>

      <QuestTabs questId={questId} />

      <div className="mt-6">{children}</div>
    </div>
  );
}
