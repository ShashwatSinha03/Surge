import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { QuestTabs } from '@/features/quests/components/quest-tabs';
import type { Quest } from '@/types';

type Props = {
  children: React.ReactNode;
  params: Promise<{ questId: string }>;
};

export const dynamic = 'force-dynamic';

export default async function QuestLayout({ children, params }: Props) {
  const { userId } = await auth();
  if (!userId) return null;

  const { questId } = await params;

  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single<{ id: string }>();

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
              <span className="text-xs text-muted bg-surface px-2.5 py-1 rounded-full capitalize">
                {quest.status}
              </span>
              <span className="text-xs text-muted capitalize">
                {quest.template_type.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
      </header>

      <QuestTabs questId={questId} />

      <div className="mt-6">{children}</div>
    </div>
  );
}
