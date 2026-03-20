import { Injectable, KeyedInstanceFactory } from '@rs-x/core';
import { type Observable, Subject, type Subscription } from 'rxjs';

import type { IExpression } from '../expressions/expression-parser.interface';
import type { IExpressionChangeSubscriptionManager } from './expression-change-subscription-manager.interface';

@Injectable()
export class ExpressionChangeSubscriptionManager
  extends KeyedInstanceFactory<IExpression, IExpression, Subject<IExpression>>
  implements IExpressionChangeSubscriptionManager
{
  public constructor() {
    super();
  }

  private readonly _changed = new Subject<IExpression>();
  private readonly _subscriptions = new Map<IExpression, Subscription>();

  public get changed(): Observable<IExpression> {
    return this._changed.asObservable();
  }

  public override getId(expression: IExpression): IExpression {
    return expression;
  }

  protected override createId(expression: IExpression): IExpression {
    return expression;
  }

  protected override createInstance(
    expression: IExpression,
    id: IExpression,
  ): Subject<IExpression> {
    const subject = new Subject<IExpression>();
    const subscription = expression.changed.subscribe((e) => {
      const expr = e as IExpression;
      subject.next(expr);
      this._changed.next(expr);
    });
    this._subscriptions.set(id, subscription);
    return subject;
  }

  protected override releaseInstance(
    subject: Subject<IExpression>,
    id: IExpression,
  ): void {
    const subscription = this._subscriptions.get(id);
    if (subscription) {
      subscription.unsubscribe();
      this._subscriptions.delete(id);
    }
    subject.complete();
  }
}
