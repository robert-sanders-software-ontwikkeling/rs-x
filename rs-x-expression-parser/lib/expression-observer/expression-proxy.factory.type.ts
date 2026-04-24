import { type IDisposableOwner, type IKeyedInstanceFactory } from '@rs-x/core';
import { type IObserver } from '@rs-x/state-manager';

import type { IExpression } from '../expressions/expression-parser.interface';

export interface IExpressionObserverData {
  owner?: IDisposableOwner;
  expression: IExpression;
}

export type IExpressionObserverFactory = IKeyedInstanceFactory<
  IExpression,
  IExpressionObserverData,
  IObserver
>;
