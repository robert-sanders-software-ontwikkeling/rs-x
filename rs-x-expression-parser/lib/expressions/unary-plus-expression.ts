import { type AbstractExpression } from './abstract-expression';
import { ExpressionType } from './expression-parser.interface';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class UnaryPlusExpression extends ParameterizedExpression<number> {
  constructor(expressionString: string, expression: AbstractExpression) {
    super(ExpressionType.UnaryPlus, expressionString, expression);
  }

  public override clone(): this {
    return new (this.constructor as new (
      expressionString: string,
      expression: AbstractExpression,
    ) => this)(this.expressionString, this._childExpressions[0].clone());
  }

  protected override evaluateExpression(a: string | number): number {
    return +a;
  }
}
