import type { IIndexWatchRule } from '@rs-x/state-manager';

import type { IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';
import type { IFunctionExpressionEvaluateUnitOptions } from './function-expression-evaluate-unit-options.interface';

export interface IExpressionEvaluateUnitFactory {
  createIdentifier(
    index: unknown,
    context: unknown,
    commit: (value: unknown) => void,
    indexWatchRule?: IIndexWatchRule,
  ): IExpressionEvaluateUnit;
  createMember(
    index: unknown,
    segments: IExpressionEvaluateUnit[],
  ): IExpressionEvaluateUnit;
  createFunction(
    options: IFunctionExpressionEvaluateUnitOptions,
  ): IExpressionEvaluateUnit;
}
