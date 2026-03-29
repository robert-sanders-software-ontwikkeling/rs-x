import type {
  IContextChanged,
  IIndexWatchRule,
  IStateChange,
  IWatch,
  IWatchFactory,
} from '@rs-x/state-manager';

import type {
  IExpressionEvaluateChangeManager,
  IExpressionEvaluateUnit,
} from './expression-evaluate-unit.interface';

export class IdentifierExpressionEvaluateUnit implements IExpressionEvaluateUnit {
  public readonly count = 1;
  private _value: unknown;
  private _context: unknown;
  private _watch: IWatch | undefined;
  private _disposed = false;
  private _isReplica = false;
  private _changeManager!: IExpressionEvaluateChangeManager;
  private _activeCycleDepth = 0;
  private _forceDirtyCommit = false;

  constructor(
    public readonly index: unknown,
    context: unknown,
    private readonly _watchFactory: IWatchFactory,
    private readonly _watchRule: IIndexWatchRule | undefined,
    private readonly _commit: (value: unknown, forceDirty?: boolean) => void,
    private readonly _ownerId: unknown,
    private readonly _readValue?: (context: unknown, index: unknown) => unknown,
    private readonly _isDeferredValue?: (value: unknown) => boolean,
    private readonly _forceDirtyForObjectChanges = false,
    private readonly _forceDirtyForCollectionItemObjectChanges = false,
    private readonly _prepare?: () => void,
  ) {
    this._context = context;
  }

  public get value(): unknown {
    return this._value;
  }

  public get context(): unknown {
    return this._context;
  }

  public set context(value: unknown) {
    if (this._context === value) {
      // Same reference can still require a refresh (for example mutated Date/async state).
      // This path is not a direct watch `changed` callback, so we diff before marking dirty.
      this.refreshValueForUnchangedContext();
      return;
    }

    const previousValue = this._value;
    this.releaseWatch();
    this._context = value;
    if (this._watchRule) {
      this._watchRule.context = value;
    }
    this._value = undefined;

    if (this._changeManager && this._context !== undefined && !this._disposed) {
      this.watch(this._changeManager);
      // Rebind path: only enqueue reevaluation when effective value changed.
      if (!Object.is(previousValue, this._value)) {
        this._changeManager.markDirty(this);
      }
    }
  }
  private onChanged = (change: IStateChange) => {
    const objectChanged =
      change.newValue !== null && typeof change.newValue === 'object';
    this._forceDirtyCommit =
      objectChanged &&
      (this._forceDirtyForObjectChanges ||
        this._forceDirtyForCollectionItemObjectChanges);
    this._value = change.newValue;
    this._changeManager.markDirty(this);
  };

  private onContextChanged = (change: IContextChanged) => {
    this._context = change.context;
  };

  private onStartChangeCycle = () => {
    this._activeCycleDepth++;
    this._changeManager.incrementChangeCycle();
  };

  private onEndChangeCycle = () => {
    if (this._activeCycleDepth > 0) {
      this._activeCycleDepth--;
    }
    this._changeManager.decrementChangeCycle();
  };

  public watchAsReplica(changeManager: IExpressionEvaluateChangeManager): void {
    this._isReplica = true;
    this._changeManager = changeManager;
    if (this.context === undefined) {
      return;
    }
    // Read the initial value directly — no watch listener registered.
    const resolvedValue = this.resolveValueFromContext();
    this._value = this._isDeferredValue?.(resolvedValue) ? undefined : resolvedValue;
  }

  public applyChange(newValue: unknown): void {
    const objectChanged = newValue !== null && typeof newValue === 'object';
    this._forceDirtyCommit =
      objectChanged &&
      (this._forceDirtyForObjectChanges ||
        this._forceDirtyForCollectionItemObjectChanges);
    this._value = newValue;
  }

  public watch(changeManager: IExpressionEvaluateChangeManager): void {
    this._changeManager = changeManager;
    if (this.context === undefined) {
      return;
    }

    if (this._watch) {
      return;
    }

    if (this._isReplica) {
      // Re-read the current value on context refresh — still no listener registration.
      const resolvedValue = this.resolveValueFromContext();
      this._value = this._isDeferredValue?.(resolvedValue) ? undefined : resolvedValue;
      return;
    }

    this._watch = this._watchFactory.createAndGetInstance({
      index: this.index,
      context: this.context,
      options: {
        indexWatchRule: this._watchRule,
        ownerId: this._ownerId,
      },
    });

    this._watch.addListeners(this, {
      onChanged: this.onChanged,
      onContextChanged: this.onContextChanged,
      onStartChangeCycle: this.onStartChangeCycle,
      onEndChangeCycle: this.onEndChangeCycle,
    });
    const resolvedValue = this.resolveValueFromContext();
    const fallbackValue = this._isDeferredValue?.(resolvedValue)
      ? undefined
      : resolvedValue;
    this._watch.watch();

    // Prefer watch value first, then direct read fallback.
    this._value = this._watch?.value;
    if (this._value === undefined) {
      this._value = fallbackValue;
    }
  }

  public prepareForBatchEvaluate(): void {
    this._prepare?.();
  }

  public isCommitReady(): boolean {
    return true;
  }

  public commitChange(): void {
    if (this._value === undefined) {
      return;
    }
    const forceDirty = this.consumeForceDirtyCommit();
    if (forceDirty) {
      this._commit(this.value, true);
      return;
    }
    this._commit(this.value);
  }

  public consumeForceDirtyCommit(): boolean {
    const forceDirty = this._forceDirtyCommit;
    this._forceDirtyCommit = false;
    return forceDirty;
  }

  public dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this.releaseWatch();
    this._value = undefined;
  }

  private releaseWatch(): void {
    if (!this._watch) {
      return;
    }

    while (this._activeCycleDepth > 0) {
      this._activeCycleDepth--;
      this._changeManager.decrementChangeCycle();
    }

    this._watch.removeListeners(this);
    this._watch.dispose();
    this._watch = undefined;
  }

  private resolveValueFromContext(): unknown {
    const context = this._context as
      | Record<PropertyKey, unknown>
      | Map<unknown, unknown>
      | undefined
      | null;
    if (context === undefined || context === null) {
      return undefined;
    }

    if (this._readValue) {
      try {
        return this._readValue(context, this.index);
      } catch {
        return undefined;
      }
    }

    if (context instanceof Map) {
      return context.get(this.index);
    }

    const index = this.index as PropertyKey;
    return context[index];
  }

  private refreshValueForUnchangedContext(): void {
    if (!this._changeManager || this._disposed || this._context === undefined) {
      return;
    }

    if (this._isReplica) {
      // Replicas have no watch to release — just re-read from context.
      const previousValue = this._value;
      const resolved = this.resolveValueFromContext();
      this._value = this._isDeferredValue?.(resolved) ? undefined : resolved;
      if (!Object.is(previousValue, this._value)) {
        this._changeManager.markDirty(this);
      }
      return;
    }

    const previousValue = this._value;
    this.releaseWatch();
    this._value = undefined;
    if (this._watchRule) {
      this._watchRule.context = this._context;
    }
    this.watch(this._changeManager);
    // Manual refresh path: avoid noisy reevaluations when recomputed value is unchanged.
    if (!Object.is(previousValue, this._value)) {
      this._changeManager.markDirty(this);
    }
  }
}
