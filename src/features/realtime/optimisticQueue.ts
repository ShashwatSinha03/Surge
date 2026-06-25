import type { OptimisticEntry } from './realtimeTypes';

export type QueueEntry<T> = {
  id: string;
  tempId: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  entity: T;
  previousSnapshot: T | null;
  error: string | null;
  createdAt: string;
};

type QueueListener<T> = (entry: QueueEntry<T>) => void;

export class OptimisticQueue<T extends { id: string }> {
  private entries = new Map<string, QueueEntry<T>>();
  private listeners = new Set<QueueListener<T>>();

  enqueue(entity: T, tempId: string | null, previousSnapshot: T | null): string {
    const id = `opt:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const entry: QueueEntry<T> = {
      id,
      tempId,
      status: 'pending',
      entity,
      previousSnapshot,
      error: null,
      createdAt: new Date().toISOString(),
    };
    this.entries.set(id, entry);
    this.notify(entry);
    return id;
  }

  confirm(entityId: string, resolver: (pending: T) => T) {
    for (const [queueId, entry] of this.entries) {
      const match = entry.tempId === entityId || entry.entity.id === entityId;
      if (match && entry.status === 'pending') {
        const resolved = resolver(entry.entity);
        const updated: QueueEntry<T> = { ...entry, status: 'confirmed', entity: resolved };
        this.entries.set(queueId, updated);
        this.notify(updated);
        return;
      }
    }
  }

  fail(entityId: string, error: string) {
    for (const [queueId, entry] of this.entries) {
      const match = entry.tempId === entityId || entry.entity.id === entityId;
      if (match && entry.status === 'pending') {
        const updated: QueueEntry<T> = { ...entry, status: 'failed', error };
        this.entries.set(queueId, updated);
        this.notify(updated);
        return;
      }
    }
  }

  rollback(entityId: string): T | null {
    for (const [, entry] of this.entries) {
      const match = entry.tempId === entityId || entry.entity.id === entityId;
      if (match) {
        this.entries.delete(entry.id);
        this.notify({ ...entry, status: 'failed', error: 'Rolled back' });
        return entry.previousSnapshot;
      }
    }
    return null;
  }

  getPendingCount(): number {
    let count = 0;
    for (const entry of this.entries.values()) {
      if (entry.status === 'pending') count++;
    }
    return count;
  }

  subscribe(listener: QueueListener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(entry: QueueEntry<T>) {
    for (const listener of this.listeners) {
      listener(entry);
    }
  }
}
