import {
  ChangeDetectorRef,
  inject,
  NgZone,
  type OnDestroy,
  Pipe,
  type PipeTransform,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { Type, UnsupportedException } from '@rs-x/core';
import {
  AbstractExpression,
  CompiledExpression,
  type IExpression,
} from '@rs-x/expression-parser';

import { IExpressionFactoryToken } from './rsx.providers';

@Pipe({
  name: 'rsx',
  pure: false,
  standalone: true,
})
export class RsxPipe implements PipeTransform, OnDestroy {
  private readonly _changeDetectorRef = inject(ChangeDetectorRef);
  private readonly _ngZone = inject(NgZone);
  private readonly _expressionFactory = inject(IExpressionFactoryToken);
  private _expression?: IExpression<unknown>;
  private _changedSubscription?: Subscription;
  private _lastExpressionString?: string;
  private _lastContext?: object;
  private _ownsExpression = false;
  private _value: unknown;

  public transform<T>(
    expression: string | IExpression<T> | null | undefined,
    context?: object,
  ): T {
    const isExpression = this.isExpressionInstance(expression);
    if (
      (isExpression && this._expression !== expression) ||
      (!isExpression && expression !== this._lastExpressionString) ||
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
    if (this.isExpressionInstance(expression)) {
      this._lastExpressionString = undefined;
      this._expression = expression;
      this._ownsExpression = false;
    } else if (Type.isString(expression)) {
      this._lastExpressionString = expression;
      if (context) {
        this._expression = this._expressionFactory.create(context, expression);
        this._ownsExpression = true;
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

    this._value = this._expression.value;
    this.requestViewCheck();
    this._changedSubscription = this._expression.changed.subscribe(() => {
      this._value = this._expression!.value;
      this.requestViewCheck();
    });
  }

  private requestViewCheck(): void {
    if (NgZone.isInAngularZone()) {
      this._changeDetectorRef.markForCheck();
      return;
    }

    this._ngZone.run(() => {
      this._changeDetectorRef.markForCheck();
    });
  }

  private disposeExpression(): void {
    if (this._ownsExpression) {
      this._expression?.dispose();
    }
    this._changedSubscription?.unsubscribe();
    this._changedSubscription = undefined;
    this._expression = undefined;
    this._ownsExpression = false;
  }

  private isExpressionInstance(
    value: string | IExpression | null | undefined,
  ): value is IExpression {
    if (!value || Type.isString(value)) {
      return false;
    }

    return (
      value instanceof AbstractExpression ||
      value instanceof CompiledExpression
    );
  }
}
