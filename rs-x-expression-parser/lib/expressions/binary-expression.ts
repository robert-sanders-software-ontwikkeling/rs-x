import { type AbstractExpression } from './abstract-expression';
import { type ExpressionType } from './expression-parser.interface';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export abstract class BinaryExpression<
  T = unknown,
  PT = unknown,
> extends ParameterizedExpression<T, PT> {
  protected constructor(
    expressionType: ExpressionType,
    expressionString: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ) {
    super(expressionType, expressionString, leftExpression, rightExpression);
  }

  public override clone(): this {
    return new (this.constructor as new (
      expressionString: string,
      leftExpression: AbstractExpression,
      rightExpression: AbstractExpression,
    ) => this)(
      this.expressionString,
      this._childExpressions[0].clone(),
      this._childExpressions[1].clone(),
    );
  }
}
