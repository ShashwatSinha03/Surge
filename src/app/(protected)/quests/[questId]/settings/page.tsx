import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { DeleteQuestButton } from '@/components/quests/delete-quest-button';
import type { Quest, MemberRole } from '@/types';

type Props = {
  params: Promise<{ questId: string }>;
};

export const dynamic = 'force-dynamic';

const STATUS_BADGE_COLORS: Record<string, 'healthy' | 'attention' | 'critical' | 'open' | 'completed'> = {
  draft: 'open',
  active: 'healthy',
  paused: 'attention',
  completed: 'completed',
  archived: 'attention',
  deleted: 'critical',
};

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase mb-3">{title}</h2>
  );
}

export default async function QuestSettingsPage({ params }: Props) {
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
    .select('role')
    .eq('quest_id', questId)
    .eq('user_id', user.id)
    .single<{ role: MemberRole }>();

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

  const totalMembers = await supabase
    .from('quest_members')
    .select('id', { count: 'exact', head: true })
    .eq('quest_id', questId);

  const memberCount = totalMembers.count ?? 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-medium text-fg">Quest Settings</h1>
        <p className="text-muted text-sm mt-1">{quest.title}</p>
      </header>

      <section>
        <SectionHeader title="Quest Status" />
        <div className="rounded-xl border border-surface bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fg">Current Status</p>
              <p className="text-xs text-muted mt-0.5">
                {quest.status === 'draft' && 'This quest is still in draft.'}
                {quest.status === 'active' && 'This quest is currently running.'}
                {quest.status === 'paused' && 'This quest is paused.'}
                {quest.status === 'completed' && 'This quest has been completed.'}
                {quest.status === 'archived' && 'This quest has been archived.'}
              </p>
            </div>
            <Badge variant="status" color={STATUS_BADGE_COLORS[quest.status] ?? 'open'}>
              {quest.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-border/50">
            <div>
              <p className="text-xs text-muted/60 uppercase tracking-wider mb-1">Template</p>
              <p className="text-fg capitalize">{quest.template_type.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-muted/60 uppercase tracking-wider mb-1">Members</p>
              <p className="text-fg">{memberCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted/60 uppercase tracking-wider mb-1">Created</p>
              <p className="text-fg">{new Date(quest.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted/60 uppercase tracking-wider mb-1">Role</p>
              <p className="text-fg capitalize">{membership.role}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="Notification Preferences" />
        <div className="rounded-xl border border-surface bg-surface p-5 divide-y divide-border/50">
          <p className="text-sm text-muted/60 pb-4">
            Notification preferences will be available in a future update.
          </p>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-fg">Mentions</p>
              <p className="text-xs text-muted mt-0.5">Get notified when someone mentions you</p>
            </div>
            <span className="text-xs text-muted/40 px-3 py-1 rounded-full border border-border bg-surface">
              Disabled
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-fg">Milestone updates</p>
              <p className="text-xs text-muted mt-0.5">Get notified when milestones change status</p>
            </div>
            <span className="text-xs text-muted/40 px-3 py-1 rounded-full border border-border bg-surface">
              Disabled
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm text-fg">Action assignments</p>
              <p className="text-xs text-muted mt-0.5">Get notified when you&apos;re assigned an action</p>
            </div>
            <span className="text-xs text-muted/40 px-3 py-1 rounded-full border border-border bg-surface">
              Disabled
            </span>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="Danger Zone" />
        <div className="rounded-xl border border-status-critical/20 bg-status-critical/5 p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-medium text-status-critical">Delete this quest</p>
              <p className="text-xs text-muted mt-0.5">
                Permanently delete this quest and all its data. This action cannot be undone.
              </p>
            </div>
            <DeleteQuestButton questId={questId} />
          </div>
        </div>
      </section>
    </div>
  );
}
