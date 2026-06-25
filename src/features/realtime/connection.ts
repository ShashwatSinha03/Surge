import type { ConnectionStatus } from './realtimeTypes';

export type ConnectionListener = (status: ConnectionStatus) => void;

export class ConnectionState {
  private status: ConnectionStatus = 'offline';
  private listeners = new Set<ConnectionListener>();
  private syncingCount = 0;

  get current(): ConnectionStatus {
    return this.status;
  }

  connect() {
    this.setStatus('connected');
  }

  reconnecting() {
    this.setStatus('reconnecting');
  }

  disconnect() {
    this.syncingCount = 0;
    this.setStatus('offline');
  }

  beginSync() {
    this.syncingCount++;
    if (this.syncingCount > 0 && this.status === 'connected') {
      this.setStatus('syncing');
    }
  }

  endSync() {
    this.syncingCount = Math.max(0, this.syncingCount - 1);
    if (this.syncingCount === 0 && this.status === 'syncing') {
      this.setStatus('connected');
    }
  }

  subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private setStatus(next: ConnectionStatus) {
    if (this.status === next) return;
    this.status = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }
}

export const connectionState = new ConnectionState();
