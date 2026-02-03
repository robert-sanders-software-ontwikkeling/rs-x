import { type AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './expression-parser.interface';

export class LogicalAndExpression extends BinaryExpression {
  constructor(
    expressionString: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ) {
    super(
      ExpressionType.And,
      expressionString,
      leftExpression,
      rightExpression,
    );
  }

  protected override evaluateExpression(a: unknown, b: unknown): unknown {
    return a && b;
  }
}
