import type { IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';
import { ValueChange } from './value-change.enum';

export class FunctionExpressionEvaluateUnit implements IExpressionEvaluateUnit {
  private _context: unknown;

  constructor(
    public readonly index: unknown,
    context: unknown,
    private readonly _objectExpressionUnit: IExpressionEvaluateUnit | undefined,
    private readonly _functionExpressionUnit: IExpressionEvaluateUnit | undefined,
    private readonly _argumentsExpressionUnit: IExpressionEvaluateUnit | undefined,
    private readonly _commit: (value: unknown) => void,
  ) {
    this._context = context;
  }

  public get context(): unknown {
    return this._context;
  }

  public set context(value: unknown) {
    this._context = value;
  }

  public get value(): unknown {
    return undefined;
  }

  public dispose(): void {
    this._objectExpressionUnit?.dispose();
    this._functionExpressionUnit?.dispose();
    this._argumentsExpressionUnit?.dispose();
  }

  public setValue(value: unknown, context: unknown, index: unknown): ValueChange {
    const statuses: ValueChange[] = [];

    if (this._objectExpressionUnit) {
      statuses.push(this._objectExpressionUnit.setValue(value, context, index));
    }

    if (this._functionExpressionUnit) {
      statuses.push(this._functionExpressionUnit.setValue(value, context, index));
    }

    if (this._argumentsExpressionUnit) {
      statuses.push(this._argumentsExpressionUnit.setValue(value, context, index));
    }

    if (
      statuses.length === 0 ||
      statuses.every((status) => status === ValueChange.NotApplicable)
    ) {
      return ValueChange.NotApplicable;
    }

    if (statuses.some((status) => status === ValueChange.Changed)) {
      return ValueChange.Changed;
    }

    if (statuses.some((status) => status === ValueChange.Initialized)) {
      return ValueChange.Initialized;
    }

    if (statuses.some((status) => status === ValueChange.Unintialized)) {
      return ValueChange.Unintialized;
    }

    return ValueChange.Unchanged;
  }

  public commit(): void {
    this._commit(undefined);
  }
}
