'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ConnectionIndicator } from '@/components/realtime/ConnectionIndicator';
import { PresenceAvatars } from '@/components/realtime/PresenceAvatars';
import { presenceManager } from '@/features/realtime/presence';
import { realtimeManager } from '@/features/realtime/realtimeManager';

type Props = {
  questId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  children: React.ReactNode;
};

export function QuestLayoutClient({ questId, userId, userName, userAvatar, children }: Props) {
  const pathname = usePathname();
  const joinedRef = useRef(false);

  useEffect(() => {
    if (joinedRef.current) return;

    const view = pathname.endsWith('/milestones') ? 'milestones' as const
      : pathname.endsWith('/activity') ? 'activity' as const
      : pathname.endsWith('/team') ? 'team' as const
      : pathname.endsWith('/settings') ? 'settings' as const
      : 'quest' as const;

    presenceManager.join(questId, {
      userId,
      name: userName,
      avatar: userAvatar,
      currentView: view,
      currentEntity: null,
      lastHeartbeat: new Date().toISOString(),
    });

    const unsub = realtimeManager.subscribeToQuest(questId);
    joinedRef.current = true;

    return () => {
      unsub();
      presenceManager.leave();
      joinedRef.current = false;
    };
  }, [questId, userId, userName, userAvatar, pathname]);

  useEffect(() => {
    const view = pathname.endsWith('/milestones') ? 'milestones' as const
      : pathname.endsWith('/activity') ? 'activity' as const
      : pathname.endsWith('/team') ? 'team' as const
      : pathname.endsWith('/settings') ? 'settings' as const
      : 'quest' as const;

    presenceManager.updateContext(view, null);
  }, [pathname]);

  return (
    <>
      <div className="flex items-center gap-3">
        <ConnectionIndicator />
        <PresenceAvatars questId={questId} />
      </div>
      {children}
    </>
  );
}
