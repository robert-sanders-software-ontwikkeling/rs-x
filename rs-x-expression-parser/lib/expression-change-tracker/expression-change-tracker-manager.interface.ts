import { IDisposable, ISingletonFactory } from '@rs-x/core';

import { Observable } from 'rxjs';
import { IExpression } from '../expressions/expression-parser.interface';
import { IExpressionChangeHistory } from './expression-change-history.interface';

export interface IExpressionChangeTracker extends IDisposable {
   readonly changed: Observable<IExpressionChangeHistory[]>;
    pause(): void;
    continue(): void
}

export type IExpressionChangeTrackerManager =  ISingletonFactory<IExpression, IExpression, IExpressionChangeTracker>;