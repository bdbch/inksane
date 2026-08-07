export type EventListener<T extends any[] = any[]> = (...args: T) => void;
type EventName<T extends Record<string, any>> = Extract<keyof T, string>;
type EventArguments<T extends Record<string, any>, K extends EventName<T>> = T[K] extends any[]
  ? T[K]
  : [T[K]];

export class EventEmitter<T extends Record<string, any>> {
  private listeners: Record<string, EventListener[]> = {};

  /**
   * Registers an event listener for the specified event name.
   * @param eventName The name of the event to listen for.
   * @param listener The callback function to be invoked when the event is emitted.
   */
  public on<K extends EventName<T>>(
    eventName: K,
    listener: EventListener<EventArguments<T, K>>,
  ): void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(listener);
  }

  /**
   * Removes an event listener for the specified event name.
   * @param eventName The name of the event to remove the listener from.
   * @param listener The callback function to be removed.
   */
  public off<K extends EventName<T>>(
    eventName: K,
    listener: EventListener<EventArguments<T, K>>,
  ): void {
    if (!this.listeners[eventName]) {
      return;
    }
    this.listeners[eventName] = this.listeners[eventName].filter((l) => l !== listener);
  }

  /**
   * Emits an event with the specified name and arguments, invoking all registered listeners for that event.
   * @param eventName The name of the event to emit.
   * @param args The arguments to pass to the event listeners.
   */
  public emit<K extends EventName<T>>(eventName: K, ...args: EventArguments<T, K>): void {
    if (!this.listeners[eventName]) {
      return;
    }
    this.listeners[eventName].forEach((listener) => {
      (listener as EventListener<EventArguments<T, K>>)(...args);
    });
  }

  /**
   * Registers a one-time event listener for the specified event name. The listener will be invoked only once and then removed.
   * @param eventName The name of the event to listen for.
   * @param listener The callback function to be invoked when the event is emitted.
   */
  public once<K extends EventName<T>>(
    eventName: K,
    listener: EventListener<EventArguments<T, K>>,
  ): void {
    const onceListener: EventListener<EventArguments<T, K>> = (...args: EventArguments<T, K>) => {
      listener(...args);
      this.off(eventName, onceListener);
    };
    this.on(eventName, onceListener);
  }

  public removeEventListeners(eventName: EventName<T>): void {
    if (!this.listeners[eventName]) {
      return;
    }
    this.listeners[eventName] = [];
  }

  /**
   * Removes all registered event listeners for all events.
   * @remarks This will clear all event listeners for all event names.
   */
  public removeListeners() {
    this.listeners = {};
  }
}
