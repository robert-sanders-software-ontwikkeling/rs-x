import { PENDING } from '@rs-x/core';

import type {
  IExpressionEvaluateChangeManager,
  IExpressionEvaluateUnit,
} from './expression-evaluate-unit.interface';

export class FunctionExpressionEvaluateUnit implements IExpressionEvaluateUnit {
  public readonly count = 1;
  private _value: unknown;
  private _context: unknown;
  private _changeManager!: IExpressionEvaluateChangeManager;
  private _isDisposed = false;
  private _isWatching = false;

  private readonly _dependencyChangeManager: IExpressionEvaluateChangeManager =
    {
      isInitialized: () => this._changeManager.isInitialized(),
      incrementChangeCycle: () => this._changeManager.incrementChangeCycle(),
      decrementChangeCycle: () => this._changeManager.decrementChangeCycle(),
      markDirty: () => {
        this._value = this.evaluateSafely();
        this._changeManager.markDirty(this);
      },
    };

  constructor(
    public readonly index: unknown,
    context: unknown,
    private readonly _dependencies: readonly IExpressionEvaluateUnit[],
    private readonly _evaluate: () => unknown,
    private readonly _commit: () => void,
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
    this._context = value;
    this._value = this.evaluateSafely();
    if (this._changeManager) {
      this._changeManager.markDirty(this);
    }
  }

  public watch(changeManager: IExpressionEvaluateChangeManager): void {
    this._changeManager = changeManager;
    if (!this._isWatching) {
      for (let i = 0; i < this._dependencies.length; i++) {
        this._dependencies[i].watch(this._dependencyChangeManager);
      }
      this._isWatching = true;
    }
    this._value = this.evaluateSafely();
  }

  public isCommitReady(): boolean {
    return true;
  }

  public commitChange(): void {
    if (this._value === undefined) {
      return;
    }
    this._commit();
  }

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    for (let i = 0; i < this._dependencies.length; i++) {
      this._dependencies[i].dispose();
    }
  }

  private evaluateSafely(): unknown {
    try {
      const value = this._evaluate();
      return value === PENDING ? undefined : value;
    } catch {
      return undefined;
    }
  }
}
