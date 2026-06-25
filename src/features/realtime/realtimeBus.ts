import type { RealtimeEvent, RealtimeBusCallback, RealtimeBusUnsubscribe } from './realtimeTypes';
import { EventDeduplicator } from './eventDeduplicator';

class RealtimeBus {
  private subscribers = new Map<string, Set<RealtimeBusCallback>>();
  private deduplicator = new EventDeduplicator();

  subscribe(channel: string, callback: RealtimeBusCallback): RealtimeBusUnsubscribe {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(callback);

    return () => {
      this.subscribers.get(channel)?.delete(callback);
    };
  }

  dispatch(channel: string, event: RealtimeEvent) {
    if (this.deduplicator.isDuplicate(event.event.id)) return;
    const subs = this.subscribers.get(channel);
    if (!subs) return;
    for (const callback of subs) {
      callback(event);
    }
  }

  clearDeduplicator() {
    this.deduplicator.clear();
  }
}

export const realtimeBus = new RealtimeBus();
