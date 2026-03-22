import type { IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';

export interface IFunctionExpressionEvaluateUnitOptions {
  readonly index: unknown;
  readonly context: unknown;
  readonly objectExpressionUnit?: IExpressionEvaluateUnit;
  readonly functionExpressionUnit?: IExpressionEvaluateUnit;
  readonly argumentsExpressionUnit?: IExpressionEvaluateUnit;
  readonly commit: (value: unknown) => void;
}
