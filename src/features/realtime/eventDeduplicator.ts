export class EventDeduplicator {
  private cache: Set<string>;
  private maxSize: number;
  private order: string[];

  constructor(maxSize = 500) {
    this.cache = new Set();
    this.maxSize = maxSize;
    this.order = [];
  }

  isDuplicate(eventId: string): boolean {
    if (this.cache.has(eventId)) return true;
    this.add(eventId);
    return false;
  }

  private add(eventId: string) {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.order.shift();
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.add(eventId);
    this.order.push(eventId);
  }

  clear() {
    this.cache.clear();
    this.order = [];
  }
}
