import type { IKeyedInstanceFactory } from '@rs-x/core';

import type { IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';

export interface IEvaluateManagerForExpression {
  register(evaluateUnit: IExpressionEvaluateUnit): void;
  dispose(): void;
}

export interface IExpressionEvaluateManager
  extends IKeyedInstanceFactory<
    () => void,
    () => void,
    IEvaluateManagerForExpression
  > {}
