import type { IKeyedInstanceFactory } from '@rs-x/core';
import type { Observable, Subject } from 'rxjs';

import type { IExpression } from '../expressions/expression-parser.interface';

export interface IExpressionChangeSubscriptionManager
  extends IKeyedInstanceFactory<IExpression, IExpression, Subject<IExpression>> {
  readonly changed: Observable<IExpression>;
}
