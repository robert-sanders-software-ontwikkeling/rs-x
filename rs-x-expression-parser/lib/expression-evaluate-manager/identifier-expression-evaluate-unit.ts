import type { IIndexWatchRule, IStateManager } from '@rs-x/state-manager';

import type { IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';
import { ValueChange } from './value-change.enum';

export class IdentifierExpressionEvaluateUnit implements IExpressionEvaluateUnit {
  private _value: unknown;
  private _context: unknown;

  constructor(
    public readonly index: unknown,
    context: unknown,
    private readonly _stateManager: IStateManager,
    private readonly _commit: (value: unknown) => void,
    private readonly _indexWatchRule?: IIndexWatchRule,
  ) {
    this.context = context;
  }

  public get context(): unknown {
    return this._context;
  }

  public get value(): unknown {
    return this._value;
  }

  public set context(value: unknown) {
    if (this._context === value) {
      return;
    }

    if (this._context) {
      this.releaseState();
    }

    this._context = value;

    if (this._context) {
      this._stateManager.watchState(this.context, this.index, {
        indexWatchRule: this._indexWatchRule,
      });
    }
  }

  public dispose(): void {
    this.releaseState();
  }

  public setValue(value: unknown, context: unknown, index: unknown): ValueChange {
    if (context !== this.context || this.index !== index) {
      return ValueChange.NotApplicable;
    }

    if (value === this._value) {
      return ValueChange.Unchanged;
    }

    const status =
      this._value === undefined
        ? ValueChange.Initialized
        : value === undefined
          ? ValueChange.Unintialized
          : ValueChange.Changed;

    this.context = context;
    this._value = value;

    return status;
  }

  public commit(): void {
    if (this._value === undefined) {
      return;
    }

    this._commit(this._value);
  }

  private releaseState(): void {
    this._stateManager.releaseState(this.context, this.index, this._indexWatchRule);
  }
}
