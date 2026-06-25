import { createBrowserClient } from '@/lib/supabase/client';
import type { PresenceState } from './realtimeTypes';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type PresenceListener = (presences: PresenceState[]) => void;

export class PresenceManager {
  private channel: RealtimeChannel | null = null;
  private questId: string = '';
  private listeners = new Set<PresenceListener>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private currentUser: PresenceState | null = null;

  join(questId: string, user: PresenceState) {
    this.leave();
    this.questId = questId;
    this.currentUser = user;

    const supabase = createBrowserClient();
    const channelName = `surge:v1:quest:${questId}:presence`;

    this.channel = supabase.channel(channelName);

    this.channel
      .on('presence', { event: 'sync' }, () => {
        if (!this.channel) return;
        const state = this.channel.presenceState();
        const allPresences: PresenceState[] = [];
        for (const presences of Object.values(state)) {
          for (const p of presences as unknown as PresenceState[]) {
            if (p && typeof p === 'object' && 'userId' in p) {
              allPresences.push(p);
            }
          }
        }
        allPresences.sort((a, b) => a.name.localeCompare(b.name));
        for (const listener of this.listeners) {
          listener(allPresences);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.track();
        }
      });

    this.heartbeatInterval = setInterval(() => this.track(), 30000);
  }

  updateContext(view: PresenceState['currentView'], entity: string | null) {
    if (!this.currentUser) return;
    this.currentUser = { ...this.currentUser, currentView: view, currentEntity: entity };
    this.track();
  }

  private async track() {
    if (!this.currentUser || !this.channel) return;
    this.currentUser.lastHeartbeat = new Date().toISOString();
    await this.channel.track(this.currentUser);
  }

  subscribe(listener: PresenceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  leave() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.channel) {
      const supabase = createBrowserClient();
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.questId = '';
    this.currentUser = null;
  }
}

export const presenceManager = new PresenceManager();
