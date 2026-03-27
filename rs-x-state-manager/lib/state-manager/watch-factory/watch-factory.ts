import { Observable, Subject, Subscription } from 'rxjs';

import {
  GuidKeyedInstanceFactory,
  IDisposable,
  IDisposableOwner,
  IGuidFactory,
  IKeyedInstanceFactory,
  Inject,
  Injectable,
  RsXCoreInjectionTokens,
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
}

export interface IWatchDispableOwner extends IDisposableOwner {}

class Watch implements IWatch {
  private _watchReferenceCount = 0;
  private _change = new Subject<IStateChange>();
  private _contextChanged = new Subject<IContextChanged>();
  private _startChangeCycle = new Subject<IChangeCycleIndex>();
  private _endChangeCycle = new Subject<IChangeCycleIndex>();
  private _isWatched = false;
  private _isDisposed = false;
  private _changeSubscription!: Subscription | undefined;
  private _contextChangedSubscription!: Subscription | undefined;
  private _startChangeCycleSubscription!: Subscription | undefined;
  private _endChangeCycleSubscription!: Subscription | undefined;
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
    return this._change;
  }

  public get contextChange(): Observable<IContextChanged> {
    return this._contextChanged;
  }

  public get startChangeCycle(): Observable<IChangeCycleIndex> {
    return this._startChangeCycle;
  }

  public get endChangeCycle(): Observable<IChangeCycleIndex> {
    return this._endChangeCycle;
  }

  public watch(): void {
    this._watchReferenceCount++;
    if (this._isWatched) {
      return;
    }

    if (Type.isReadonlyProperty(this.context, this.index)) {
      this._value = this._stateManager.getState(this.context, this.index);
    } else {
      this._value = this._stateManager.watchState(
        this.context,
        this.index,
        this._options,
      );
      // Some state transitions (for async/deferred values) can resolve during watch setup.
      // Read back the current state snapshot so `watch.value` reflects the latest state.
      if (this._value === undefined) {
        this._value = this._stateManager.getState(this.context, this.index);
      }
    }
    this._changeSubscription = this._stateManager.changed.subscribe(
      this.onChanged,
    );
    this._contextChangedSubscription =
      this._stateManager.contextChanged.subscribe(this.onContextChanged);
    this._startChangeCycleSubscription =
      this._stateManager.startChangeCycle.subscribe(this.onStartChangeCycle);
    this._endChangeCycleSubscription =
      this._stateManager.endChangeCycle.subscribe(this.onEndChangeCycle);
    this._isWatched = true;
  }

  private onChanged = (change: IStateChange) => {
    if (change.context == this._context && change.index === this.index) {
      this._value = change.newValue;
      this._change.next(change);
    }
  };

  private onContextChanged = (change: IContextChanged) => {
    if (
      this._options.ownerId === undefined &&
      this._context === change.oldContext &&
      this.index === change.index
    ) {
      this._context = change.context;
      this._contextChanged.next(change);
    }
  };

  private onStartChangeCycle = (cylceIndex: IChangeCycleIndex) => {
    if (
      this._context === cylceIndex.context &&
      this.index === cylceIndex.index
    ) {
      this._startChangeCycle.next(cylceIndex);
    }
  };

  private onEndChangeCycle = (cylceIndex: IChangeCycleIndex) => {
    if (
      this._context === cylceIndex.context &&
      this.index === cylceIndex.index
    ) {
      this._endChangeCycle.next(cylceIndex);
    }
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
      this._changeSubscription?.unsubscribe();
      this._changeSubscription = undefined;
      this._contextChangedSubscription?.unsubscribe();
      this._contextChangedSubscription = undefined;
      this._startChangeCycleSubscription?.unsubscribe();
      this._startChangeCycleSubscription = undefined;
      this._endChangeCycleSubscription?.unsubscribe();
      this._endChangeCycleSubscription = undefined;

      this._isWatched = false;
    }
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
  string,
  IWatchData,
  IWatch,
  IWatchId
>;

@Injectable()
export class WatchFactory
  extends GuidKeyedInstanceFactory<IWatchData, IWatch, IWatchId>
  implements IWatchFactory
{
  private readonly _identityMap = new WeakMap<object, string>();
  private _identityIndex = 0;

  constructor(
    @Inject(RsXStateManagerInjectionTokens.IStateManager)
    private readonly _stateManager: IStateManager,
    @Inject(RsXCoreInjectionTokens.IGuidFactory)
    guidFactory: IGuidFactory,
  ) {
    super(guidFactory);
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
  protected override createInstance(data: IWatchData, id: string): IWatch {
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
