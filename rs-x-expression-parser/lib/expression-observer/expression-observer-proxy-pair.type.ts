import { type IObserverProxyPair } from '@rs-x/state-manager';

import { type AbstractExpression } from '../expressions/abstract-expression';

export type IExpressionObserverProxyPair =
  IObserverProxyPair<AbstractExpression>;
