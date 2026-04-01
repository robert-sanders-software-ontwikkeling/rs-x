import { PENDING } from '@rs-x/core';

import type {
  IExpressionEvaluateChangeManager,
  IExpressionEvaluateUnit,
} from './expression-evaluate-unit.interface';

export class FunctionExpressionEvaluateUnit
  implements IExpressionEvaluateUnit, IExpressionEvaluateChangeManager {
  public readonly count = 1;
  private _value: unknown;
  private _context: unknown;
  private _changeManager!: IExpressionEvaluateChangeManager;
  private _isDisposed = false;
  private _isWatching = false;

  public isInitialized(): boolean {
    return this._changeManager.isInitialized();
  }

  public incrementChangeCycle(): void {
    this._changeManager.incrementChangeCycle();
  }

  public decrementChangeCycle(): void {
    this._changeManager.decrementChangeCycle();
  }

  public markDirty(evaluateUnit: IExpressionEvaluateUnit): void {
    this._onDependencyDirty?.(evaluateUnit);
    const beforeEval = this._value;
    this._value = this.evaluateSafely();
    if (typeof this.index === 'string' && this.index.includes('trackPrice')) {
      console.log('[DEBUG FuncUnit.markDirty]', this.index.slice(0, 50), 'dep=', evaluateUnit.index, 'before=', beforeEval, 'after=', this._value);
    }
    this._changeManager.markDirty(this);
  }

  constructor(
    public readonly index: unknown,
    context: unknown,
    private readonly _dependencies: readonly IExpressionEvaluateUnit[],
    private readonly _evaluate: () => unknown,
    private readonly _commit: () => void,
    private readonly _onDependencyDirty?: (
      evaluateUnit: IExpressionEvaluateUnit,
    ) => void,
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
        this._dependencies[i].watch(this);
      }
      this._isWatching = true;
    }
    this._value = this.evaluateSafely();
  }

  public isCommitReady(): boolean {
    return true;
  }

  public commitChange(): void {
    if (typeof this.index === 'string' && this.index.includes('trackPrice')) {
      console.log('[DEBUG FuncUnit.commitChange]', this.index, '_value=', this._value);
    }
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
