import { inject, Injectable } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';

import {
  IExpressionChangeTransactionManagerToken,
  IExpressionFactoryToken,
} from '@rs-x/angular';
import { IExpression } from '@rs-x/expression-parser';

interface IModel {
  x: number;
  r: number;
}

@Injectable({ providedIn: 'root' })
export class MyFormula {
  private _isDisposed = false;
  private readonly _expressionFactory = inject(IExpressionFactoryToken);
  private readonly _expressionChangeTransactionManager = inject(
    IExpressionChangeTransactionManagerToken,
  );
  private readonly _changed: Subject<number | undefined>;
  private readonly _changedSubscription: Subscription;
  private readonly _expression: IExpression<number | undefined>;
  private readonly _model: IModel = {
    x: 10,
    r: 2,
  };

  constructor() {
    this._changed = new Subject();
    this._expression = this._expressionFactory.create(
      this._model,
      'r * x * (1 - x)',
    );
    this._changedSubscription = this._expression.changed.subscribe(() =>
      this._changed.next(this._expression.value),
    );
  }

  public get changed(): Observable<number | undefined> {
    return this._changed;
  }

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._expression.dispose();
    this._changedSubscription.unsubscribe();
    this._isDisposed = true;
  }

  public update(r: number, x: number): void {
    this._expressionChangeTransactionManager.suspend();
    this._model.r = r;
    this._model.x = x;
    this._expressionChangeTransactionManager.continue();
  }
}
