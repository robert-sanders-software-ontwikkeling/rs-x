import type { IDisposable, IKeyedInstanceFactory } from '@rs-x/core';

import type { IExpressionEvaluateUnit } from './expression-evaluate-unit.interface';

export interface IEvaluateManagerForExpression extends IDisposable {
  register(evaluateUnit: IExpressionEvaluateUnit): void;
  initialize(): void;
}

export type CommitHandler = (initialized: boolean) => void;

export interface IExpressionEvaluateManager extends IKeyedInstanceFactory<
  CommitHandler,
  CommitHandler,
  IEvaluateManagerForExpression
> {}
