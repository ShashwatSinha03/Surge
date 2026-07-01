'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

const FALLBACK_COLOR = '#E0E0E0';

function getFgColor(): string {
  if (typeof window === 'undefined') return FALLBACK_COLOR;
  const value = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim();
  return value || FALLBACK_COLOR;
}

type SurgeLoaderProps = {
  size?: number;
  speed?: number;
  label?: string;
  className?: string;
};

export function SurgeLoader({ size = 70, speed = 1.25, label, className }: SurgeLoaderProps) {
  const colorRef = useRef<string>(getFgColor());

  useEffect(() => {
    async function load() {
      const { treadmill } = await import('ldrs');
      treadmill.register();
    }
    load();
  }, []);

  useEffect(() => {
    colorRef.current = getFgColor();
    const observer = new MutationObserver(() => {
      colorRef.current = getFgColor();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-6', className)}
    >
      <l-treadmill
        size={String(size)}
        speed={String(speed)}
        color={colorRef.current}
      />
      {label && (
        <p className="text-sm text-muted font-chillax tracking-wide">{label}</p>
      )}
      <span className="sr-only">Loading</span>
    </div>
  );
}
