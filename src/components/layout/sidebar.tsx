import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { SidebarClient } from './sidebar-client';

export async function Sidebar() {
  const user = await currentUser();
  const { userId } = await auth();

  let recentQuests: { id: string; title: string }[] = [];

  if (userId) {
    const supabase = createServerClient();

    const { data: dbUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single<{ id: string }>();

    if (dbUser) {
      const { data: memberRows } = await supabase
        .from('quest_members')
        .select('quest_id')
        .eq('user_id', dbUser.id);

      if (memberRows && memberRows.length > 0) {
        const questIds = memberRows.map((r) => r.quest_id);
        const { data: quests } = await supabase
          .from('quests')
          .select('id, title')
          .in('id', questIds)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (quests) recentQuests = quests;
      }
    }
  }

  return (
    <aside className="w-64 h-full flex flex-col border-r border-surface bg-bg shrink-0 overflow-y-auto">
      <div className="px-5 py-6">
        <Link href="/quests" className="text-xl font-semibold tracking-tight text-fg">
          Surge
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <Link
          href="/quests"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-fg bg-surface font-medium"
        >
          Quests
        </Link>

        <span className="block px-3 pt-5 pb-2 text-xs text-muted/60 font-secondary tracking-widest uppercase">
          Recent
        </span>

        {recentQuests.length > 0 ? (
          recentQuests.map((q) => (
            <Link
              key={q.id}
              href={`/quests/${q.id}`}
              className="block px-3 py-2 rounded-lg text-sm text-muted hover:text-fg hover:bg-surface transition-colors truncate"
            >
              {q.title}
            </Link>
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-muted/40">
            No quests yet
          </div>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-surface mt-auto">
        <div className="flex items-center justify-between px-3 py-2 text-sm text-muted">
          <span className="truncate">
            {user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'User'}
          </span>
          <SidebarClient />
        </div>
      </div>
    </aside>
  );
}
