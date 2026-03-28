import { Observable } from 'rxjs';

/**
 * O(1)-removal broadcast dispatcher.
 *
 * Uses a Map for subscriber storage so add and remove are both O(1),
 * while dispatch() remains O(N) (unavoidable for a broadcast).
 *
 * Use `addListener`/`removeListener` for direct zero-allocation registration.
 * The `observable` property provides RxJS interop for external consumers.
 */
export class Dispatcher<T> {
  private readonly _listeners = new Map<unknown, (value: T) => void>();
  private _nextId = 0;

  readonly observable: Observable<T> = new Observable<T>((subscriber) => {
    const id = this._nextId++;
    this._listeners.set(id, (value) => subscriber.next(value));
    return () => this._listeners.delete(id);
  });

  /** Direct registration — skips RxJS SafeSubscriber/Subscription overhead entirely. */
  addListener(key: unknown, callback: (value: T) => void): void {
    this._listeners.set(key, callback);
  }

  removeListener(key: unknown): void {
    this._listeners.delete(key);
  }

  dispatch(value: T): void {
    for (const listener of this._listeners.values()) {
      listener(value);
    }
  }
}
