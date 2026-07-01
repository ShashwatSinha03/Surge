import { auth } from '@clerk/nextjs/server';
import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getQuestActivityService } from '@/features/activity/activityService';
import type { Quest, Milestone, Action, MemberRole } from '@/types';
import type { MomentumResponse } from '@/features/momentum/types';
import { calculateQuestMomentum } from '@/features/momentum/calculateMomentum';
import type { ActivityEntry, ActivityFilter } from '@/features/activity/activityTypes';

import { Badge } from '@/components/ui/badge';

type Props = {
  params: Promise<{ questId: string }>;
};

export const dynamic = 'force-dynamic';

function TrendArrow({ direction }: { direction: string }) {
  if (direction === 'up') return <span className="text-status-healthy text-sm">&#8593;</span>;
  if (direction === 'down') return <span className="text-status-critical text-sm">&#8595;</span>;
  return <span className="text-muted text-sm">&#8594;</span>;
}

function getActionCounts(actions: Action[]) {
  return {
    total: actions.length,
    completed: actions.filter((a) => a.status === 'completed').length,
    claimed: actions.filter((a) => a.status === 'claimed').length,
    unclaimed: actions.filter((a) => a.status === 'open').length,
    blocked: actions.filter((a) => a.status === 'blocked').length,
  };
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs text-muted/60 font-secondary tracking-widest uppercase">{title}</h2>
      {href && (
        <Link href={href} className="text-xs text-muted hover:text-fg transition-colors">
          View all
        </Link>
      )}
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 70 ? '#22c55e' : value >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="inline-flex items-center gap-4">
      <div className="relative shrink-0">
        <svg width="96" height="96" className="-rotate-90">
          <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" className="text-border" strokeWidth="7" />
          <circle
            cx="48" cy="48" r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums text-fg">
          {value}%
        </span>
      </div>
      <span className="text-xs text-muted/60 font-secondary tracking-widest uppercase">Progress</span>
    </div>
  );
}

function RoleBadge({ role }: { role: MemberRole }) {
  const colors: Record<MemberRole, string> = {
    owner: 'text-status-claimed',
    admin: 'text-status-attention',
    member: 'text-muted',
  };
  return <span className={`text-[10px] uppercase tracking-wider ${colors[role]}`}>{role}</span>;
}

export default async function QuestOverviewPage({ params }: Props) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const { questId } = await params;
  const supabase = createServerClient();

  const { data: user } = await supabase
    .from('users')
    .select('id, name')
    .eq('clerk_user_id', clerkUserId)
    .single<{ id: string; name: string }>();

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

  const [{ data: milestones }, { data: actionsData }, membersResult] = await Promise.all([
    supabase.from('milestones').select('*').eq('quest_id', questId).order('position', { ascending: true }),
    supabase.from('actions').select('*').eq('quest_id', questId),
    supabase
      .from('quest_members')
      .select('id, user_id, role, joined_at, users!inner(name, email, avatar_url)')
      .eq('quest_id', questId),
  ]);

  const allMembers = ((membersResult.data ?? []) as unknown as {
    id: string; user_id: string; role: string; joined_at: string;
    users: { name: string; email: string; avatar_url: string | null };
  }[]).map((m) => ({
    id: m.id,
    userId: m.user_id,
    role: m.role as MemberRole,
    joinedAt: m.joined_at,
    name: m.users.name,
    email: m.users.email,
    avatarUrl: m.users.avatar_url,
  }));

  const allMilestones: Milestone[] = milestones ?? [];
  const allActions: Action[] = actionsData ?? [];

  const completedMilestones = allMilestones.filter((m) => m.status === 'completed').length;
  const totalMilestones = allMilestones.length;
  const completionPct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const nextMilestone = allMilestones.find((m) => m.status !== 'completed');
  const actionCounts = getActionCounts(allActions);

  let activityItems: ActivityEntry[] = [];
  try {
    const result = await getQuestActivityService(questId, { limit: 8, type: 'all' as ActivityFilter });
    activityItems = result.items;
  } catch {
    // Activity unavailable
  }

  let momentum: MomentumResponse | null = null;
  try {
    momentum = await calculateQuestMomentum(questId);
  } catch {
    // Momentum unavailable
  }

  const owner = allMembers.find((m) => m.role === 'owner');

  const healthColor = momentum
    ? momentum.momentum.overall >= 70 ? 'text-status-healthy'
      : momentum.momentum.overall >= 40 ? 'text-status-attention'
      : 'text-status-critical'
    : 'text-muted';

  return (
    <div className="space-y-8 sm:space-y-10 p-4 sm:p-6 max-w-5xl">
      {/* Quest Title & Description */}
      <div>
        <h1 className="text-xl sm:text-2xl font-medium text-fg">{quest.title}</h1>
        {quest.description && (
          <p className="text-sm text-muted mt-1.5 leading-relaxed whitespace-pre-wrap">{quest.description}</p>
        )}
      </div>

      <ProgressRing value={completionPct} />

      {/* Health & Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Progress Card */}
        <section>
          <SectionHeader title="Milestones" />
          <div className="rounded-xl border border-surface bg-surface p-4 sm:p-5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-semibold text-fg">{completedMilestones}/{totalMilestones}</span>
              <span className="text-sm text-muted">complete</span>
            </div>
            {nextMilestone && (
              <p className="mt-3 text-sm text-muted">
                Next: <span className="text-fg">{nextMilestone.title}</span>
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {actionCounts.claimed > 0 && (
                <Badge variant="status" color="claimed">{actionCounts.claimed} claimed</Badge>
              )}
              {actionCounts.unclaimed > 0 && (
                <Badge variant="status" color="open">{actionCounts.unclaimed} open</Badge>
              )}
              {actionCounts.blocked > 0 && (
                <Badge variant="status" color="critical">{actionCounts.blocked} blocked</Badge>
              )}
            </div>
          </div>
        </section>

        {/* Health Card */}
        <section>
          <SectionHeader title="Health" href={momentum ? `/quests/${questId}/mission-control` : undefined} />
          <div className="rounded-xl border border-surface bg-surface p-5">
            {momentum ? (
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="flex flex-col items-center shrink-0">
                  <span className={`text-2xl sm:text-3xl font-semibold ${healthColor}`}>{momentum.momentum.overall}</span>
                  <TrendArrow direction={momentum.momentum.trend.direction} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg leading-relaxed">{momentum.mission.summary}</p>
                  {momentum.recommendations.length > 0 && (
                    <p className="mt-2 text-xs text-status-attention">{momentum.recommendations[0].title}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl font-semibold text-muted/30">--</span>
                <p className="text-sm text-muted">Health data will appear once the quest has enough activity.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Recent Activity + Live Team in a 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Recent Activity */}
        <section>
          <SectionHeader title="Recent Activity" href={`/quests/${questId}/activity`} />
          {activityItems.length > 0 ? (
            <div>
              {activityItems.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 py-2.5 border-l-2 border-border/40 pl-3 ml-0.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg truncate">{entry.title}</p>
                    <p className="text-xs text-muted/60 truncate">{entry.actor.name}</p>
                  </div>
                </div>
              ))}
              <div className="mt-3">
                <Link
                  href={`/quests/${questId}/activity`}
                  className="text-xs text-muted hover:text-fg transition-colors ml-3 min-touch inline-flex items-center"
                >
                  View all activity &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted/40 py-8 text-center">No recent activity</p>
          )}
        </section>

        {/* Live Team */}
        <section>
          <SectionHeader title={`Team (${allMembers.length})`} href={`/quests/${questId}/team`} />
          <div className="rounded-xl border border-surface bg-surface p-4">
            {allMembers.length > 0 ? (
              <div className="divide-y divide-border/50">
                {allMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center text-xs text-muted font-medium flex-shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg truncate">{member.name}</p>
                      <p className="text-xs text-muted truncate">{member.email}</p>
                    </div>
                    <RoleBadge role={member.role} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted/60 py-8 text-center">No members yet</p>
            )}
          </div>
        </section>
      </div>

      {/* Quest Metadata */}
      <section>
        <SectionHeader title="Details" />
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-muted/60">
          <span>Template: <span className="text-muted capitalize">{quest.template_type.replace(/_/g, ' ')}</span></span>
          <span>Created: <span className="text-muted">{new Date(quest.created_at).toLocaleDateString()}</span></span>
          <span>Owner: <span className="text-muted">{owner?.name ?? '—'}</span></span>
          <span>Status: <span className="text-muted">{quest.status}</span></span>
          <span>Actions: <span className="text-muted">{actionCounts.total}</span></span>
        </div>
      </section>

    </div>
  );
}
