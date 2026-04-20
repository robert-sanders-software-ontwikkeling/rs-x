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
} from '../expression-evaluate-manager/expression-evaluate-unit.interface';

export class CompiledDependencyEvaluateUnit implements IExpressionEvaluateUnit {
  public readonly count = 1;
  private _value: unknown;
  private _context: unknown;
  private _watch: IWatch | undefined;
  private _disposed = false;
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
    private readonly _readValue: (context: unknown, index: unknown) => unknown,
    private readonly _isDeferredValue: (value: unknown) => boolean,
    private readonly _forceDirtyForObjectChanges = false,
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
      return;
    }
    const previousValue = this._value;
    this.releaseWatch();
    this._context = value;
    if (this._watchRule) {
      this._watchRule.context = value;
    }
    this._value = undefined;
    if (this._changeManager && !this._disposed && this._context !== undefined) {
      this.watch(this._changeManager);
      if (!Object.is(previousValue, this._value)) {
        this._changeManager.markDirty(this);
      }
    }
  }

  public watch(changeManager: IExpressionEvaluateChangeManager): void {
    this._changeManager = changeManager;
    if (this.context === undefined) {
      return;
    }
    if (this._watch) {
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

    this._watch.watch();
    this._value = this._watch.value;
    if (this._value === undefined) {
      const resolved = this.resolveValueFromContext();
      this._value = this._isDeferredValue(resolved) ? undefined : resolved;
    }
  }

  public isCommitReady(): boolean {
    return true;
  }

  public commitChange(): void {
    if (this._value === undefined) {
      return;
    }
    const forceDirty = this.consumeForceDirtyCommit();
    this._commit(this._value, forceDirty);
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

  private onChanged = (change: IStateChange) => {
    const objectChanged =
      change.newValue !== null && typeof change.newValue === 'object';
    this._forceDirtyCommit = objectChanged && this._forceDirtyForObjectChanges;
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
    if (this._context === undefined || this._context === null) {
      return undefined;
    }
    try {
      return this._readValue(this._context, this.index);
    } catch {
      return undefined;
    }
  }
}
