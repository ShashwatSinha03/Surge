'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Sun, Moon, Search } from 'lucide-react';

function getInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('surge-theme') as 'dark' | 'light') ?? 'dark';
}

export function MobileNav() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('surge-theme', next);
      return next;
    });
  }, []);

  const isQuestPage = pathname.startsWith('/quests/') && pathname !== '/quests' && !pathname.startsWith('/quests/new');
  const questMatch = pathname.match(/^\/quests\/([^/]+)/);
  const questId = questMatch?.[1];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg border-t border-surface safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-14 px-2">
        <Link
          href="/quests"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] rounded-lg px-3 ${
            pathname === '/quests' ? 'text-fg' : 'text-muted'
          }`}
          aria-label="Quests"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          }}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] rounded-lg px-3 text-muted"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-medium">Search</span>
        </button>

        <button
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] rounded-lg px-3 text-muted"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span className="text-[10px] font-medium">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        <div className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-3 text-muted">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-5 h-5',
                userButtonPopoverCard: 'bg-bg border border-surface rounded-xl shadow-lg overflow-hidden mb-2',
                userButtonPopoverActions: 'divide-y divide-surface',
                userButtonPopoverActionButton: 'px-4 py-2.5 text-sm text-fg hover:bg-surface transition-colors',
                userButtonPopoverActionButtonText: 'text-fg',
                userButtonPopoverFooter: 'px-4 py-2.5 text-xs text-muted border-t border-surface',
              },
            }}
          />
          <span className="text-[10px] font-medium">Profile</span>
        </div>
      </div>
    </nav>
  );
}
