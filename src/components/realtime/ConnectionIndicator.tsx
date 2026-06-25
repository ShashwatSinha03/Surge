'use client';

import { useState, useEffect } from 'react';
import { connectionState } from '@/features/realtime/connection';
import type { ConnectionStatus } from '@/features/realtime/realtimeTypes';

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string }> = {
  connected: { color: 'bg-green-400', label: 'Connected' },
  reconnecting: { color: 'bg-yellow-400', label: 'Reconnecting...' },
  offline: { color: 'bg-red-400', label: 'Offline' },
  syncing: { color: 'bg-blue-400', label: 'Syncing...' },
};

export function ConnectionIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>('offline');

  useEffect(() => {
    const unsub = connectionState.subscribe(setStatus);
    return unsub;
  }, []);

  const config = STATUS_CONFIG[status];

  return (
    <div
      className="flex items-center gap-1.5"
      title={config.label}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.color} transition-colors`} />
      <span className="text-[10px] text-muted/40 font-secondary tracking-wider uppercase hidden sm:inline">
        {config.label}
      </span>
    </div>
  );
}
