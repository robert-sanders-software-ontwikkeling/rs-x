import { type AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './expression-parser.interface';

export class StrictInequalityExpression extends BinaryExpression<boolean> {
  constructor(
    expressionString: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ) {
    super(
      ExpressionType.StrictInequality,
      expressionString,
      leftExpression,
      rightExpression,
    );
  }

  protected override evaluateExpression(a: unknown, b: unknown): boolean {
    return a !== b;
  }
}
