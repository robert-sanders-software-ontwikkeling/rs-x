import { type IStateManager } from '@rs-x/state-manager';

import { type IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';

export class ComputedIndexExpressionEvaluateUnit implements IExpressionEvaluateUnit {
  public readonly count = 1;
  private _value: unknown;
  private _context: unknown;
  private _indexValue: unknown;
  private _isWatching = false;
  private _isDipsosed = false;

  constructor(
    private readonly _stateManager: IStateManager,
    private readonly _ownerId: unknown,
    private readonly _commit: () => void,
  ) {}

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
    if (this._context !== undefined && this._indexValue !== undefined) {
      this.releaseState();
    }
    this._context = value;
    this._value = undefined;
    if (this._context !== undefined && this._indexValue !== undefined) {
      this.watch();
    }
  }

  public get index(): unknown {
    return this._indexValue;
  }

  public setIndex(indexValue: unknown): void {
    if (this._indexValue === indexValue) {
      return;
    }

    const previousValue = this._value;
    if (this._context !== undefined && this._indexValue !== undefined) {
      this.releaseState();
    }
    this._value = undefined;
    this._indexValue = indexValue;
    if (this._context !== undefined && this._indexValue !== undefined) {
      this.watch();
      if (this._value !== undefined && !Object.is(previousValue, this._value)) {
        this._commit();
      }
    }
  }

  public watch(): unknown {
    if (this._context !== undefined && this._indexValue !== undefined) {
      this._stateManager.watchState(this._context, this._indexValue, {
        ownerId: this._ownerId,
      });
      this._isWatching = true;

      this.syncValueFromState();
      return this._value;
    }
    return undefined;
  }

  public dispose(): void {
    if (this._isDipsosed) {
      return;
    }
    this._isDipsosed = true;
    if (this._context !== undefined && this._indexValue !== undefined) {
      this.releaseState();
    }
  }

  public clear(): void {
    this._value = undefined;
  }

  public setContext(
    context: unknown,
    oldContext: unknown,
    index: unknown,
  ): void {
    if (oldContext === this.context || this.index === index) {
      this.context = context;
    }
  }

  public isCommitReady(): boolean {
    return true;
  }

  public setValue(
    value: unknown,
    context: unknown,
    index: unknown,
    _initialized: boolean,
  ): IExpressionEvaluateUnit | null {
    if (this.context !== context || index !== this._indexValue) {
      return null;
    }

    this.context = context;
    this._value = value;

    return this;
  }

  public commitChange(): void {
    if (this._value === undefined) {
      return;
    }
    this._commit();
  }

  private releaseState(): void {
    if (this._isWatching) {
      this._stateManager.releaseState(this._context, this._indexValue);
      this._isWatching = false;
    }
  }

  private syncValueFromState(): void {
    if (this._context === undefined || this._indexValue === undefined) {
      this._value = undefined;
      return;
    }

    try {
      this._value = this._stateManager.getState(
        this._context,
        this._indexValue,
      );
    } catch {
      this._value = undefined;
    }
  }
}
