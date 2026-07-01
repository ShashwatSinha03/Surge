'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { id: '', label: 'Overview' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'activity', label: 'Activity' },
  { id: 'mission-control', label: 'Mission Control' },
  { id: 'team', label: 'Team' },
  { id: 'settings', label: 'Settings' },
] as const;

export function QuestTabs({ questId }: { questId: string }) {
  const pathname = usePathname();
  const currentTab = pathname.endsWith('/milestones')
    ? 'milestones'
    : pathname.endsWith('/activity')
      ? 'activity'
      : pathname.endsWith('/mission-control')
        ? 'mission-control'
        : pathname.endsWith('/team')
          ? 'team'
          : pathname.endsWith('/settings')
            ? 'settings'
            : '';

  return (
    <nav className="flex gap-2 sm:gap-6 border-b border-border overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
      {TABS.map((tab) => {
        const href = tab.id === '' ? `/quests/${questId}` : `/quests/${questId}/${tab.id}`;
        const isActive = currentTab === tab.id;

        return (
          <Link
            key={tab.id}
            href={href}
            className={`shrink-0 pb-3 text-sm font-medium transition-colors border-b-2 min-h-[44px] flex items-center ${
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
