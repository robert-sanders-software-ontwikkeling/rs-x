import { type Observable } from 'rxjs';

import {
  Dispatcher,
  GroupedKeyedInstanceFactory,
  type IDisposable,
  type IDisposableOwner,
  type IKeyedInstanceFactory,
  Inject,
  Injectable,
  Type,
} from '@rs-x/core';

import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokens';
import type {
  IChangeCycleIndex,
  IContextChanged,
  IStateChange,
  IStateManager,
  IStateOptions,
} from '../state-manager.interface';

export interface IWatchCallbacks {
  onChanged: (change: IStateChange) => void;
  onContextChanged: (change: IContextChanged) => void;
  onStartChangeCycle: (cycle: IChangeCycleIndex) => void;
  onEndChangeCycle: (cycle: IChangeCycleIndex) => void;
}

export interface IWatch extends IDisposable {
  readonly changed: Observable<IStateChange>;
  readonly contextChange: Observable<IContextChanged>;
  readonly startChangeCycle: Observable<IChangeCycleIndex>;
  readonly endChangeCycle: Observable<IChangeCycleIndex>;
  readonly context: unknown;
  readonly index: unknown;
  readonly value: unknown;
  watch(): void;
  unwatch(): void;
  /** Zero-allocation alternative to subscribing to the four Observables individually. */
  addListeners(key: unknown, callbacks: IWatchCallbacks): void;
  removeListeners(key: unknown): void;
}

export interface IWatchDispableOwner extends IDisposableOwner {}

class Watch implements IWatch {
  private _watchReferenceCount = 0;
  private readonly _changeDispatcher = new Dispatcher<IStateChange>();
  private readonly _contextChangedDispatcher =
    new Dispatcher<IContextChanged>();
  private readonly _startChangeCycleDispatcher =
    new Dispatcher<IChangeCycleIndex>();
  private readonly _endChangeCycleDispatcher =
    new Dispatcher<IChangeCycleIndex>();
  private _isWatched = false;
  private _isDisposed = false;
  private _stateEventUnsubscribe: VoidFunction | undefined;
  private _value: unknown;

  constructor(
    private readonly _owner: IWatchDispableOwner,
    private _context,
    public readonly index: unknown,
    private readonly _options: IStateOptions,
    private readonly _stateManager: IStateManager,
  ) {}

  public get context(): unknown {
    return this._context;
  }

  public get value(): unknown {
    return this._value;
  }

  public get changed(): Observable<IStateChange> {
    return this._changeDispatcher.observable;
  }

  public get contextChange(): Observable<IContextChanged> {
    return this._contextChangedDispatcher.observable;
  }

  public get startChangeCycle(): Observable<IChangeCycleIndex> {
    return this._startChangeCycleDispatcher.observable;
  }

  public get endChangeCycle(): Observable<IChangeCycleIndex> {
    return this._endChangeCycleDispatcher.observable;
  }

  public watch(): void {
    this._watchReferenceCount++;
    if (this._isWatched) {
      return;
    }

    if (Type.isReadonlyProperty(this.context, this.index)) {
      this._value = this._stateManager.getState(this.context, this.index);
    } else {
      this._value = this._stateManager.watchState(this.context, this.index, {
        ...this._options,
        suppressInitialChangeEmit: true,
      });
      // Some state transitions (for async/deferred values) can resolve during watch setup.
      // Read back the current state snapshot so `watch.value` reflects the latest state.
      if (this._value === undefined) {
        this._value = this._stateManager.getState(this.context, this.index);
      }
    }
    this._stateEventUnsubscribe = this._stateManager.subscribeStateEvents(
      this.context,
      this.index,
      {
        onStateChange: this.onChanged,
        onContextChanged: this.onContextChanged,
        onStartChangeCycle: this.onStartChangeCycle,
        onEndChangeCycle: this.onEndChangeCycle,
      },
    );
    this._isWatched = true;
  }

  private onChanged = (change: IStateChange) => {
    if (change.context == this._context && change.index === this.index) {
      this._value = change.newValue;
      this._changeDispatcher.dispatch(change);
    }
  };

  private onContextChanged = (change: IContextChanged) => {
    if (
      this._options.ownerId === undefined &&
      this._context === change.oldContext &&
      this.index === change.index
    ) {
      this._context = change.context;
      this._contextChangedDispatcher.dispatch(change);
    }
  };

  private onStartChangeCycle = (cycle: IChangeCycleIndex) => {
    this._startChangeCycleDispatcher.dispatch(cycle);
  };

  private onEndChangeCycle = (cycle: IChangeCycleIndex) => {
    this._endChangeCycleDispatcher.dispatch(cycle);
  };

  public unwatch(): void {
    if (!this._isWatched) {
      return;
    }
    this._watchReferenceCount--;

    if (this._watchReferenceCount == 0) {
      this._stateManager.releaseState(
        this._context,
        this.index,
        this._options.indexWatchRule,
      );
      this._stateEventUnsubscribe?.();
      this._stateEventUnsubscribe = undefined;
      this._isWatched = false;
    }
  }

  public addListeners(key: unknown, callbacks: IWatchCallbacks): void {
    this._changeDispatcher.addListener(key, callbacks.onChanged);
    this._contextChangedDispatcher.addListener(key, callbacks.onContextChanged);
    this._startChangeCycleDispatcher.addListener(
      key,
      callbacks.onStartChangeCycle,
    );
    this._endChangeCycleDispatcher.addListener(key, callbacks.onEndChangeCycle);
  }

  public removeListeners(key: unknown): void {
    this._changeDispatcher.removeListener(key);
    this._contextChangedDispatcher.removeListener(key);
    this._startChangeCycleDispatcher.removeListener(key);
    this._endChangeCycleDispatcher.removeListener(key);
  }

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }

    const canDispose = this._owner.canDispose as () => boolean;

    if (canDispose()) {
      this._watchReferenceCount = 1;
      this.unwatch();
      this._isDisposed = true;
    }
    this._owner.release();
  }
}

export interface IWatchId {
  context: unknown;
  index: unknown;
}

export interface IWatchData extends IWatchId {
  options: IStateOptions;
}

export type IWatchFactory = IKeyedInstanceFactory<
  number,
  IWatchData,
  IWatch,
  IWatchId
>;

@Injectable()
export class WatchFactory
  extends GroupedKeyedInstanceFactory<number, IWatchData, IWatch, IWatchId>
  implements IWatchFactory
{
  private readonly _identityMap = new WeakMap<object, string>();
  private _identityIndex = 0;
  private _nextId = 0;

  constructor(
    @Inject(RsXStateManagerInjectionTokens.IStateManager)
    private readonly _stateManager: IStateManager,
  ) {
    super();
  }
  protected override getGroupId(data: IWatchId): unknown {
    return data.context;
  }
  protected override getGroupMemberId(data: IWatchId): unknown {
    const watchData = data as IWatchData;
    const watchRule = watchData.options?.indexWatchRule;

    if (watchRule === undefined) {
      return watchData.index;
    }

    return `${this.toIdentityKey(watchData.index)}|${this.toIdentityKey(watchRule)}`;
  }
  protected override createInstance(data: IWatchData, id: number): IWatch {
    return new Watch(
      {
        canDispose: () => this.getReferenceCount(id) === 1,
        release: () => this.release(id),
      },
      data.context,
      data.index,
      data.options,
      this._stateManager,
    );
  }

  protected override createUniqueId(_data: IWatchData): number {
    return this._nextId++;
  }

  private toIdentityKey(value: unknown): string {
    if (value === null) {
      return 'null';
    }

    const valueType = typeof value;
    if (valueType === 'object' || valueType === 'function') {
      const target = value as object;
      const existing = this._identityMap.get(target);
      if (existing) {
        return existing;
      }

      const key = `obj:${++this._identityIndex}`;
      this._identityMap.set(target, key);
      return key;
    }

    return `${valueType}:${String(value)}`;
  }
}
