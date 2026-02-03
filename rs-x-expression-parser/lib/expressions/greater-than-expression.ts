import { type AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './expression-parser.interface';

export class GreaterThanExpression extends BinaryExpression {
  constructor(
    expressionString: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ) {
    super(
      ExpressionType.GreaterThan,
      expressionString,
      leftExpression,
      rightExpression,
    );
  }

  protected override evaluateExpression(a: number, b: number): boolean {
    return a > b;
  }
}
