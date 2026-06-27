'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { Moon, Sun } from 'lucide-react';

export function ThemeSection() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('surge-theme') as 'dark' | 'light' | null;
    if (stored) setTheme(stored);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('surge-theme', next);
      document.documentElement.dataset.theme = next;
      return next;
    });
  }, []);

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-fg">Theme</p>
        <p className="text-xs text-muted mt-0.5">Switch between dark and light mode</p>
      </div>
      <button
        onClick={toggle}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-fg hover:bg-surface-alt transition-colors"
      >
        {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        {theme === 'dark' ? 'Dark' : 'Light'}
      </button>
    </div>
  );
}

export function AccountSection() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-fg">Account</p>
        <p className="text-xs text-muted mt-0.5">Manage your account settings</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">Manage Account</span>
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8',
              userButtonPopoverCard: 'bg-bg border border-surface rounded-xl shadow-lg overflow-hidden',
              userButtonPopoverActions: 'divide-y divide-surface',
              userButtonPopoverActionButton: 'px-4 py-2.5 text-sm text-fg hover:bg-surface transition-colors',
              userButtonPopoverActionButtonText: 'text-fg',
              userButtonPopoverFooter: 'px-4 py-2.5 text-xs text-muted border-t border-surface',
            },
          }}
        />
      </div>
    </div>
  );
}
