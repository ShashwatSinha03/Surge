import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { SidebarClient } from './sidebar-client';

export async function Sidebar({ recentQuests }: { recentQuests: { id: string; title: string }[] }) {
  const user = await currentUser();

  return (
    <aside className="hidden lg:flex w-64 h-full flex-col border-r border-surface bg-bg shrink-0" aria-label="Sidebar">
      <div className="px-5 py-6">
        <Link href="/quests" className="text-xl font-semibold tracking-tight text-fg">
          Surge
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto min-h-0" aria-label="Main navigation">
        <Link
          href="/quests"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-fg bg-surface font-medium"
        >
          Quests
        </Link>

        <h2 className="block px-3 pt-5 pb-2 text-xs text-muted/60 font-secondary tracking-widest uppercase">
          Recent
        </h2>

        {recentQuests.length > 0 ? (
          <ul className="space-y-0.5">
            {recentQuests.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/quests/${q.id}`}
                  className="block px-3 py-2 rounded-lg text-sm text-muted hover:text-fg hover:bg-surface transition-colors truncate"
                >
                  {q.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-2 text-sm text-muted/40">
            No quests yet. Create one to get started.
          </p>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-surface shrink-0">
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
