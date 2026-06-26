import { RealtimeChannel } from '@supabase/supabase-js';
import { createQuestEventsChannel, destroyChannel } from './subscriptions';
import { realtimeBus } from './realtimeBus';
import { connectionState } from './connection';
import { createBrowserClient } from '@/lib/supabase/client';
import type { RawEventRow } from '@/features/activity/activityTypes';

type ChannelEntry = {
  channel: RealtimeChannel;
  questId: string;
};

class RealtimeManager {
  private activeChannels = new Map<string, ChannelEntry>();
  private refCounts = new Map<string, number>();
  private lastCursors = new Map<string, string>();

  subscribeToQuest(questId: string, accessToken?: string): () => void {
    const key = `events:${questId}`;

    const existing = this.refCounts.get(key) ?? 0;
    this.refCounts.set(key, existing + 1);

    if (!this.activeChannels.has(key)) {
      const channel = createQuestEventsChannel({
        questId,
        accessToken,
        onEvent: (payload: RawEventRow) => {
          realtimeBus.dispatch(`quest:${questId}`, {
            type: 'domain_event',
            event: payload,
            receivedAt: new Date().toISOString(),
          });
        },
        onStatusChange: (status) => {
          switch (status) {
            case 'SUBSCRIBED':
              connectionState.connect();
              void this.replayMissedEvents(questId, accessToken);
              break;
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
              connectionState.reconnecting();
              break;
            case 'CLOSED':
              connectionState.disconnect();
              break;
          }
        },
      });

      this.activeChannels.set(key, { channel, questId });
    }

    return () => this.unsubscribeFromQuest(key);
  }

  private unsubscribeFromQuest(key: string) {
    const remaining = (this.refCounts.get(key) ?? 1) - 1;

    if (remaining <= 0) {
      this.refCounts.delete(key);
      const entry = this.activeChannels.get(key);
      if (entry) {
        destroyChannel(entry.channel);
        this.activeChannels.delete(key);
        this.lastCursors.delete(entry.questId);
      }
    } else {
      this.refCounts.set(key, remaining);
    }
  }

  setCursor(questId: string, cursor: string) {
    this.lastCursors.set(questId, cursor);
  }

  getCursor(questId: string): string | null {
    return this.lastCursors.get(questId) ?? null;
  }

  async replayMissedEvents(questId: string, accessToken?: string) {
    const cursor = this.getCursor(questId);
    if (!cursor) return;

    const supabase = accessToken
      ? createBrowserClient(accessToken)
      : createBrowserClient();
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('quest_id', questId)
      .gt('created_at', cursor)
      .order('created_at', { ascending: true });

    if (!data) return;

    for (const event of data) {
      realtimeBus.dispatch(`quest:${questId}`, {
        type: 'domain_event',
        event: event as unknown as RawEventRow,
        receivedAt: new Date().toISOString(),
      });
    }
  }

  disconnectAll() {
    for (const [key, entry] of this.activeChannels) {
      destroyChannel(entry.channel);
      this.activeChannels.delete(key);
      this.refCounts.delete(key);
    }
    this.lastCursors.clear();
    connectionState.disconnect();
  }
}

export const realtimeManager = new RealtimeManager();
