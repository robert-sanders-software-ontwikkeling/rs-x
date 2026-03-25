import { PENDING } from '@rs-x/core';

import { type IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';

export class FunctionExpressionEvaluateUnit implements IExpressionEvaluateUnit {
  public readonly count = 1;
  private _value: unknown;
  private _context: unknown;

  constructor(
    public readonly index: unknown,
    context: unknown,
    private readonly _dependencyUnits: readonly IExpressionEvaluateUnit[],
    private readonly _evaluate: () => unknown,
    private readonly _commit: (value: unknown) => void,
    private readonly _evaluateOnWatch = true,
    private readonly _eagerEvaluateOnSetValue = false,
  ) {
    this._context = context;
  }

  public get value(): unknown {
    return this._value;
  }

  public setValueDirectly(value: unknown): void {
    this._value = value;
  }

  public get context(): unknown {
    return this._context;
  }

  public set context(value: unknown) {
    this._context = value;
  }

  public watch(): unknown {
    for (let i = 0; i < this._dependencyUnits.length; i++) {
      this._dependencyUnits[i].watch();
    }

    if (!this._evaluateOnWatch) {
      return this._value;
    }

    const value = this._evaluate();
    if (value !== PENDING && value !== undefined) {
      this._value = value;
      return value;
    }

    return undefined;
  }

  public dispose(): void {
    for (let i = 0; i < this._dependencyUnits.length; i++) {
      this._dependencyUnits[i].dispose();
    }
  }

  public clear(): void {
    this._value = undefined;
    for (let i = 0; i < this._dependencyUnits.length; i++) {
      this._dependencyUnits[i].clear();
    }
  }

  public setContext(
    context: unknown,
    oldContext: unknown,
    index: unknown,
  ): void {
    for (let i = 0; i < this._dependencyUnits.length; i++) {
      this._dependencyUnits[i].setContext(context, oldContext, index);
    }
  }

  public isCommitReady(): boolean {
    return true;
  }

  public setValue(
    value: unknown,
    context: unknown,
    index: unknown,
    initialized: boolean,
  ): IExpressionEvaluateUnit | null {
    let matched = false;

    if (this.context === context && this.index === index) {
      this._value = value;
      matched = true;
    }

    for (let i = 0; i < this._dependencyUnits.length; i++) {
      const dependencyMatch = this._dependencyUnits[i].setValue(
        value,
        context,
        index,
        initialized,
      );
      if (dependencyMatch !== null) {
        matched = true;
      }
    }

    if (!matched) {
      return null;
    }

    if (
      this._eagerEvaluateOnSetValue &&
      !(this.context === context && this.index === index)
    ) {
      this._value = this._evaluate();
    }

    return this;
  }

  public commitChange(): void {
    this._commit(this._value);
  }
}
