import { type AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './expression-parser.interface';

export class InExpression extends BinaryExpression<boolean> {
  constructor(
    expressionString: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ) {
    super(ExpressionType.In, expressionString, leftExpression, rightExpression);
  }

  protected override evaluateExpression(a: string, b: object): boolean {
    return a in b;
  }
}
