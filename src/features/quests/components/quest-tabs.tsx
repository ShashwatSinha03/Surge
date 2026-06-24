'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { id: '', label: 'Overview' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'team', label: 'Team' },
  { id: 'settings', label: 'Settings' },
] as const;

export function QuestTabs({ questId }: { questId: string }) {
  const pathname = usePathname();
  const currentTab = pathname.endsWith('/milestones')
    ? 'milestones'
    : pathname.endsWith('/team')
      ? 'team'
      : pathname.endsWith('/settings')
        ? 'settings'
        : '';

  return (
    <nav className="flex gap-6 border-b border-border">
      {TABS.map((tab) => {
        const href = tab.id === '' ? `/quests/${questId}` : `/quests/${questId}/${tab.id}`;
        const isActive = currentTab === tab.id;

        return (
          <Link
            key={tab.id}
            href={href}
            className={`pb-3 text-sm transition-colors border-b-2 ${
              isActive
                ? 'text-fg border-fg'
                : 'text-muted border-transparent hover:text-fg'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
