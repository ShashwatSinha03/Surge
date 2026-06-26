'use client';

import { useState, useCallback, useEffect } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

function getInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('surge-theme') as 'dark' | 'light') ?? 'dark';
}

export function MobileHeader({ recentQuests }: { recentQuests: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
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

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, close]);

  return (
    <>
      <header className="flex lg:hidden items-center justify-between px-4 py-3 border-b border-surface bg-bg">
        <Link href="/quests" className="text-lg font-semibold tracking-tight text-fg">
          Surge
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 text-muted hover:text-fg transition-colors"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
        </button>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden="true" />
          <nav
            className="relative w-64 max-w-[80vw] h-full bg-bg border-r border-surface flex flex-col overflow-y-auto"
            aria-label="Mobile navigation"
          >
            <div className="px-5 py-6 border-b border-surface">
              <Link href="/quests" className="text-xl font-semibold tracking-tight text-fg" onClick={close}>
                Surge
              </Link>
            </div>

            <div className="flex-1 px-3 py-4 space-y-1">
              <Link
                href="/quests"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-fg bg-surface font-medium"
                onClick={close}
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
                        onClick={close}
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
            </div>

            <div className="px-3 py-4 border-t border-surface flex items-center justify-between text-sm text-muted">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
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
                    },
                  }}
                />
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
