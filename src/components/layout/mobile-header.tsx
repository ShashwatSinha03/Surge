'use client';

import Link from 'next/link';

export function MobileHeader({ recentQuests: _recentQuests }: { recentQuests: { id: string; title: string }[] }) {
  return (
    <header className="flex lg:hidden items-center justify-between px-4 py-3 border-b border-surface bg-bg">
      <Link href="/quests" className="text-lg font-semibold tracking-tight text-fg">
        Surge
      </Link>
    </header>
  );
}
