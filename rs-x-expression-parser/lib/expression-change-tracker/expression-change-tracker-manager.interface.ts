import { type Observable } from 'rxjs';

import { type IDisposable, type ISingletonFactory } from '@rs-x/core';

import { type IExpression } from '../expressions/expression-parser.interface';

import { type IExpressionChangeHistory } from './expression-change-history.interface';

export interface IExpressionChangeTracker extends IDisposable {
  readonly changed: Observable<IExpressionChangeHistory[]>;
  pause(): void;
  continue(): void;
}

export type IExpressionChangeTrackerManager = ISingletonFactory<
  IExpression,
  IExpression,
  IExpressionChangeTracker
>;
