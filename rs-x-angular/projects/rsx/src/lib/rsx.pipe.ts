import {
  ChangeDetectorRef,
  inject,
  type OnDestroy,
  Pipe,
  type PipeTransform,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { Type, UnsupportedException } from '@rs-x/core';
import { AbstractExpression, type IExpression } from '@rs-x/expression-parser';

import { IExpressionFactoryToken } from './rsx.providers';

@Pipe({
  name: 'rsx',
  pure: false,
})
export class RsxPipe implements PipeTransform, OnDestroy {
  private readonly _changeDetectorRef = inject(ChangeDetectorRef);
  private readonly _expressionFactory = inject(IExpressionFactoryToken);
  private _expression?: IExpression<unknown>;
  private _changedSubscription?: Subscription;
  private _lastExpressionString?: string;
  private _lastContext?: object;
  private _value: unknown;

  public transform<T>(
    expression: string | IExpression<T> | null | undefined,
    context?: object,
  ): T {
    if (
      (expression instanceof AbstractExpression &&
        this._expression !== expression) ||
      expression !== this._lastExpressionString ||
      context !== this._lastContext
    ) {
      this.disposeExpression();
      this.createExpression(expression, context);
    }

    return this._value as T;
  }

  public ngOnDestroy(): void {
    this.disposeExpression();
  }

  private createExpression(
    expression: string | IExpression | null | undefined,
    context?: object,
  ): void {
    if (expression instanceof AbstractExpression) {
      this._lastExpressionString = undefined;
      this._expression = expression;
    } else if (Type.isString(expression)) {
      this._lastExpressionString = expression;
      if (context) {
        this._expression = this._expressionFactory.create(context, expression);
      }
    } else if (!Type.isNullOrUndefined(expression)) {
      throw new UnsupportedException(`string or IExpression expected`);
    }

    this._lastContext = context;

    this.tryToSubscribeToExpression();
  }

  private tryToSubscribeToExpression(): void {
    if (!this._expression) {
      return;
    }
    this._changedSubscription = this._expression.changed.subscribe(() => {
      this._value = this._expression!.value;
      this._changeDetectorRef.markForCheck();
    });
  }

  private disposeExpression(): void {
    this._changedSubscription?.unsubscribe();
    this._changedSubscription = undefined;

    if (this._lastExpressionString) {
      this._expression?.dispose();
    }
    this._expression = undefined;
  }
}
