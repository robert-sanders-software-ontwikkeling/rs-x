import { type IDisposableOwner, type IKeyedInstanceFactory } from '@rs-x/core';
import { type IObserver } from '@rs-x/state-manager';

import type { AbstractExpression } from '../expressions/abstract-expression';

export interface IExpressionObserverData {
  owner?: IDisposableOwner;
  expression: AbstractExpression;
}

export type IExpressionObserverFactory = IKeyedInstanceFactory<
  AbstractExpression,
  IExpressionObserverData,
  IObserver
>;
