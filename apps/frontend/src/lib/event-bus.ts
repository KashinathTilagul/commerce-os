type EventCallback = (data: any) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  subscribe(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.unsubscribe(event, callback);
  }

  unsubscribe(event: string, callback: EventCallback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  emit(event: string, data: any) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)!) {
        callback(data);
      }
    }
    
    // Also emit a wildcard event for global listeners
    if (this.listeners.has('*')) {
      for (const callback of this.listeners.get('*')!) {
        callback({ event, data });
      }
    }
  }
}

// Global singleton so it persists across API route calls in dev mode
const globalForEventBus = globalThis as unknown as { eventBus: EventBus | undefined };
export const eventBus = globalForEventBus.eventBus ?? new EventBus();

if (process.env.NODE_ENV !== 'production') globalForEventBus.eventBus = eventBus;
