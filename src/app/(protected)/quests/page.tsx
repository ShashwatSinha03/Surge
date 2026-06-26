import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import type { QuestWithRole } from '@/types';

export const dynamic = 'force-dynamic';

export default async function QuestsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single<{ id: string }>();

  if (!user) {
    return (
      <div className="p-8 max-w-3xl">
        <header className="mb-10">
          <h1 className="text-2xl font-medium text-fg">Quests</h1>
          <p className="text-muted text-sm mt-1">No quests yet.</p>
        </header>
        <EmptyState
          title="No quests yet"
          description="Create your first one."
          action={<Button href="/quests/new" variant="primary">Create Your First Quest</Button>}
        />
      </div>
    );
  }

  const { data: memberships } = await supabase
    .from('quest_members')
    .select('quest_id, role')
    .eq('user_id', user.id);

  let quests: QuestWithRole[] = [];
  let activeQuest: QuestWithRole | null = null;

  if (memberships && memberships.length > 0) {
    const questIds = memberships.map((m) => m.quest_id);
    const roleMap = Object.fromEntries(memberships.map((m) => [m.quest_id, m.role]));

    const { data: raw } = await supabase
      .from('quests')
      .select('*')
      .in('id', questIds)
      .neq('status', 'deleted')
      .order('updated_at', { ascending: false });

    if (raw) {
      quests = raw.map((q) => ({ ...q, role: roleMap[q.id] }));
    }

    if (quests.length > 0) {
      activeQuest = quests[0];
    }
  }

  function questStatusColor(status: string) {
    if (status === 'completed') return 'completed' as const;
    if (status === 'active') return 'healthy' as const;
    return 'open' as const;
  }

  return (
    <div className="p-6 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-medium text-fg">Quests</h1>
        <p className="text-muted text-sm mt-1">
          {quests.length > 0
            ? `${quests.length} quest${quests.length === 1 ? '' : 's'}`
            : 'Start your first quest'}
        </p>
      </header>

      {activeQuest && (
        <section className="mb-6">
          <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase mb-2">
            Continue Building
          </h2>
          <Link
            href={`/quests/${activeQuest.id}`}
            className="block p-5 rounded-xl bg-surface border border-border hover:bg-surface-alt transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-fg">{activeQuest.title}</h3>
                <p className="text-sm text-muted mt-0.5 capitalize">
                  {activeQuest.template_type.replace(/_/g, ' ')}
                </p>
              </div>
              <Badge variant="status" color={questStatusColor(activeQuest.status)}>
                {activeQuest.status}
              </Badge>
            </div>
          </Link>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase">
            Your Quests
          </h2>
          <Button href="/quests/new" variant="secondary">
            New Quest
          </Button>
        </div>

        {quests.length === 0 ? (
          <EmptyState
            title="No quests yet"
            description="Create your first one."
            action={<Button href="/quests/new" variant="primary">Create Your First Quest</Button>}
          />
        ) : (
          <div className="space-y-2">
            {quests.map((quest) => (
              <Link
                key={quest.id}
                href={`/quests/${quest.id}`}
                className="flex items-center justify-between p-4 rounded-xl bg-surface border border-border hover:bg-surface-alt transition-colors"
              >
                <div>
                  <h3 className="text-sm font-medium text-fg">{quest.title}</h3>
                  <p className="text-xs text-muted mt-0.5 capitalize">
                    {quest.template_type.replace(/_/g, ' ')}
                  </p>
                </div>
                <Badge variant="status" color={questStatusColor(quest.status)}>
                  {quest.status}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
