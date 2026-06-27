'use client';

import { UserButton } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

function getInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('surge-theme') as 'dark' | 'light') ?? 'dark';
}

export function SidebarClient() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('surge-theme') as 'dark' | 'light' | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('surge-theme', next);
      return next;
    });
  }, []);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className="text-muted hover:text-fg transition-colors"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Moon className="w-4 h-4" aria-hidden="true" />
        )}
      </button>
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'w-7 h-7',
            userButtonPopoverCard: 'bg-bg border border-surface rounded-xl shadow-lg overflow-hidden',
            userButtonPopoverActions: 'divide-y divide-surface',
            userButtonPopoverActionButton: 'px-4 py-2.5 text-sm text-fg hover:bg-surface transition-colors',
            userButtonPopoverActionButtonText: 'text-fg',
            userButtonPopoverFooter: 'px-4 py-2.5 text-xs text-muted border-t border-surface',
          },
        }}
      />
    </div>
  );
}
