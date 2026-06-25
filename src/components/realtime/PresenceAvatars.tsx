'use client';

import { useState, useEffect } from 'react';
import { presenceManager } from '@/features/realtime/presence';
import type { PresenceState } from '@/features/realtime/realtimeTypes';

const MAX_VISIBLE = 4;

export function PresenceAvatars({ questId }: { questId: string }) {
  const [presences, setPresences] = useState<PresenceState[]>([]);

  useEffect(() => {
    const unsub = presenceManager.subscribe(setPresences);
    return unsub;
  }, []);

  const visible = presences.slice(0, MAX_VISIBLE);
  const remaining = presences.length - MAX_VISIBLE;

  if (presences.length === 0) return null;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((p) => (
        <div
          key={p.userId}
          className="relative group"
        >
          {p.avatar ? (
            <img
              src={p.avatar}
              alt={p.name}
              className="w-6 h-6 rounded-full ring-2 ring-bg object-cover"
            />
          ) : (
            <div className="w-6 h-6 rounded-full ring-2 ring-bg bg-surface-alt flex items-center justify-center text-[10px] text-muted font-medium">
              {p.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-surface border border-border text-xs text-fg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <p className="font-medium">{p.name}</p>
            <p className="text-muted text-[10px]">{p.currentView}{p.currentEntity ? ` — ${p.currentEntity}` : ''}</p>
          </div>
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-6 h-6 rounded-full ring-2 ring-bg bg-surface-alt flex items-center justify-center text-[10px] text-muted">
          +{remaining}
        </div>
      )}
    </div>
  );
}
