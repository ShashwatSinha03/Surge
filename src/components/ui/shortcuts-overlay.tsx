'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { registerGlobalShortcut } from '@/features/commands/shortcuts';
import { FocusTrap } from './focus-trap';

type ShortcutGroup = {
  label: string;
  shortcuts: { keys: string; description: string }[];
};

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: 'Navigation',
    shortcuts: [
      { keys: '\u2318K', description: 'Command palette' },
      { keys: '?', description: 'Show keyboard shortcuts' },
    ],
  },
  {
    label: 'Actions',
    shortcuts: [
      { keys: '\u23CE', description: 'Confirm selection' },
      { keys: '\u2191 \u2193', description: 'Navigate items' },
      { keys: '\u238B', description: 'Cancel / close' },
    ],
  },
  {
    label: 'Command Palette',
    shortcuts: [
      { keys: '\u2318K', description: 'Open / close' },
      { keys: '\u2191 \u2193', description: 'Navigate results' },
      { keys: '\u23CE', description: 'Execute command' },
      { keys: '\u238B', description: 'Close palette' },
    ],
  },
  {
    label: 'Mission Control',
    shortcuts: [
      { keys: '\u2318K', description: 'Search mission data' },
    ],
  },
  {
    label: 'General',
    shortcuts: [
      { keys: '?', description: 'Keyboard shortcuts' },
      { keys: '\u238B', description: 'Close dialogs' },
    ],
  },
];

export function ShortcutsOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    previousFocusRef.current?.focus();
  }, []);

  const open = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setIsOpen(true);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, close, open]);

  useEffect(() => {
    registerGlobalShortcut('?', () => toggle(), false);
  }, [toggle]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div className="fixed inset-0 bg-black/60" onClick={close} />
      <FocusTrap active={isOpen}>
        <div className="relative w-full max-w-md bg-bg border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-medium text-fg">Keyboard Shortcuts</h2>
            <button
              onClick={close}
              className="text-muted hover:text-fg text-sm"
              aria-label="Close shortcuts"
            >
              \u2715
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-5">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.label}>
                <h3 className="text-[10px] font-secondary uppercase tracking-widest text-muted/60 mb-2">
                  {group.label}
                </h3>
                <div className="space-y-1.5">
                  {group.shortcuts.map((s) => (
                    <div
                      key={`${group.label}:${s.keys}`}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-muted">{s.description}</span>
                      <kbd className="text-[11px] text-fg bg-surface px-2 py-0.5 rounded border border-border font-secondary">
                        {s.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-border">
            <p className="text-[11px] text-muted/60">
              Press <kbd className="text-[11px] text-fg bg-surface px-1.5 py-0.5 rounded border border-border font-secondary">?</kbd> to toggle this overlay
            </p>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
