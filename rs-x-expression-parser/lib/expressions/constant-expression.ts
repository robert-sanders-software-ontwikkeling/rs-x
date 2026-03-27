import { ConstExpressionEvaluateUnit } from '../expression-evaluate-manager/const-expression-evaluate-unit';

import { AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { type ExpressionType } from './expression-parser.interface';

export class ConstantExpression<T> extends AbstractExpression<T> {
  private readonly _constValue: T;

  constructor(type: ExpressionType, expressionString: string, constValue: T) {
    super(type, expressionString);
    this._constValue = constValue;
  }

  public override clone(): this {
    return new (this.constructor as new (constValue: T) => this)(
      this._constValue,
    );
  }

  protected get constValue(): T {
    return this._constValue;
  }

  protected override onBind(settings: IExpressionBindConfiguration): void {
    this.evaluateManagerForExpression.register(
      new ConstExpressionEvaluateUnit(this.value),
    );
    super.onBind(settings);
  }

  protected override evaluate(): T | undefined {
    return this._constValue;
  }
}
