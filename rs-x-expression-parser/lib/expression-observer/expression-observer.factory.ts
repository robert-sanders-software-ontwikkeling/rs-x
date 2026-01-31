import { ReplaySubject, Subscription } from 'rxjs';

import {
  type IDisposableOwner,
  Injectable,
  type IPropertyChange,
  SingletonFactory,
} from '@rs-x/core';
import { AbstractObserver, type IObserver } from '@rs-x/state-manager';

import type { AbstractExpression } from '../expressions/abstract-expression';
import type { IExpression } from '../expressions/expression-parser.interface';

import type {
  IExpressionObserverData,
  IExpressionObserverFactory,
} from './expression-proxy.factory.type';

class ExpressionObserver extends AbstractObserver<
  AbstractExpression,
  undefined,
  undefined
> {
  private readonly _changedSubsctiption: Subscription;

  constructor(owner: IDisposableOwner, target: AbstractExpression) {
    super(owner, target, undefined, new ReplaySubject<IPropertyChange>(1));
    this._changedSubsctiption = target.changed.subscribe(
      this.onExpressionChanged,
    );
  }

  protected override disposeInternal(): void {
    this._changedSubsctiption.unsubscribe();
  }

  private onExpressionChanged = (expression: IExpression): void => {
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
  extends SingletonFactory<
    AbstractExpression,
    IExpressionObserverData,
    IObserver
  >
  implements IExpressionObserverFactory
{
  constructor() {
    super();
  }

  public override getId(data: IExpressionObserverData): AbstractExpression {
    return data.expression;
  }

  protected override createId(
    data: IExpressionObserverData,
  ): AbstractExpression {
    return data.expression;
  }

  protected override createInstance(
    data: IExpressionObserverData,
    id: AbstractExpression,
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
