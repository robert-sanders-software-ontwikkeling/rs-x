import { ObservableMock } from '../../../rs-x-core/lib/testing';
import {
  type IChangeCycleIndex,
  type IContextChanged,
  type IStateChange,
} from '../state-manager';
import {
  type IWatch,
  type IWatchCallbacks,
} from '../state-manager/watch-factory/watch-factory';

export class WatchMock implements IWatch {
  public readonly changed = new ObservableMock<IStateChange>();
  public readonly contextChange = new ObservableMock<IContextChanged>();
  public readonly startChangeCycle = new ObservableMock<IChangeCycleIndex>();
  public readonly endChangeCycle = new ObservableMock<IChangeCycleIndex>();
  public readonly context: unknown;
  public readonly index: unknown;
  public readonly value: unknown;

  private readonly _listeners = new Map<unknown, IWatchCallbacks>();

  constructor(properties?: Partial<WatchMock>) {
    Object.assign(this, properties);
  }

  public readonly watch = jest.fn();
  public readonly unwatch = jest.fn();
  public readonly dispose = jest.fn();

  public addListeners(key: unknown, callbacks: IWatchCallbacks): void {
    this._listeners.set(key, callbacks);
  }

  public removeListeners(key: unknown): void {
    this._listeners.delete(key);
  }

  /** Test helper: emit a state change to all registered listeners. */
  public emitChanged(change: IStateChange): void {
    for (const cb of this._listeners.values()) cb.onChanged(change);
    this.changed.next(change);
  }

  /** Test helper: emit a context change to all registered listeners. */
  public emitContextChanged(change: IContextChanged): void {
    for (const cb of this._listeners.values()) cb.onContextChanged(change);
    this.contextChange.next(change);
  }

  /** Test helper: emit start-change-cycle to all registered listeners. */
  public emitStartChangeCycle(cycle: IChangeCycleIndex): void {
    for (const cb of this._listeners.values()) cb.onStartChangeCycle(cycle);
    this.startChangeCycle.next(cycle);
  }

  /** Test helper: emit end-change-cycle to all registered listeners. */
  public emitEndChangeCycle(cycle: IChangeCycleIndex): void {
    for (const cb of this._listeners.values()) cb.onEndChangeCycle(cycle);
    this.endChangeCycle.next(cycle);
  }
}
