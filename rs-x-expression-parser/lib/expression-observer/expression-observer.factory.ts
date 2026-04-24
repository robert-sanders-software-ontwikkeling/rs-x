import { ReplaySubject, Subscription } from 'rxjs';

import {
  type IDisposableOwner,
  Injectable,
  type IPropertyChange,
  KeyedInstanceFactory,
} from '@rs-x/core';
import { AbstractObserver, type IObserver } from '@rs-x/state-manager';

import type { IExpression } from '../expressions/expression-parser.interface';

import type {
  IExpressionObserverData,
  IExpressionObserverFactory,
} from './expression-proxy.factory.type';

class ExpressionObserver extends AbstractObserver<
  IExpression,
  unknown,
  undefined
> {
  private readonly _changedSubsctiption: Subscription;

  constructor(owner: IDisposableOwner, target: IExpression) {
    super(owner, target, target.value, new ReplaySubject<IPropertyChange>(1));
    this._changedSubsctiption = target.changed.subscribe(
      this.onExpressionChanged,
    );
  }

  protected override disposeInternal(): void {
    this._changedSubsctiption.unsubscribe();
  }

  private onExpressionChanged = (expression: IExpression): void => {
    this.value = expression.value;
    this.emitChange({
      arguments: [],
      chain: [],
      target: this.target,
      newValue: expression.value,
    });
  };
}
@Injectable()
export class ExpressionObserverFactory
  extends KeyedInstanceFactory<IExpression, IExpressionObserverData, IObserver>
  implements IExpressionObserverFactory
{
  constructor() {
    super();
  }

  public override getId(data: IExpressionObserverData): IExpression {
    return data.expression;
  }

  protected override createId(data: IExpressionObserverData): IExpression {
    return data.expression;
  }

  protected override createInstance(
    data: IExpressionObserverData,
    id: IExpression,
  ): IObserver {
    return new ExpressionObserver(
      {
        canDispose: () => this.getReferenceCount(id) === 1,
        release: () => {
          this.release(id);
          data.owner?.release();
        },
      },
      data.expression,
    );
  }

  protected override releaseInstance(observer: IObserver): void {
    observer.dispose();
  }
}
