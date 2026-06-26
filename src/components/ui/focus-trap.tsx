'use client';

import { useCallback, useEffect, useRef } from 'react';

type Props = {
  children: React.ReactNode;
  active: boolean;
};

export function FocusTrap({ children, active }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return containerRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
  }, []);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, getFocusableElements]);

  return <div ref={containerRef}>{children}</div>;
}
