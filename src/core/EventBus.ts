export type Unsubscribe = () => void;

export class EventBus<TEvents extends object> {
  private listeners = new Map<keyof TEvents, Set<(payload: TEvents[keyof TEvents]) => void>>();

  on<TKey extends keyof TEvents>(event: TKey, listener: (payload: TEvents[TKey]) => void): Unsubscribe {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener as (payload: TEvents[keyof TEvents]) => void);
    this.listeners.set(event, listeners);
    return () => listeners.delete(listener as (payload: TEvents[keyof TEvents]) => void);
  }

  emit<TKey extends keyof TEvents>(event: TKey, payload: TEvents[TKey]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}
