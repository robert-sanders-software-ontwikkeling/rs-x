import { type AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './expression-parser.interface';

export class BitwiseLeftShiftExpression extends BinaryExpression<
  number,
  number
> {
  constructor(
    expressionString: string,
    leftExpression: AbstractExpression<number>,
    rightExpression: AbstractExpression<number>,
  ) {
    super(
      ExpressionType.BitwiseLeftShift,
      expressionString,
      leftExpression,
      rightExpression,
    );
  }

  protected override evaluateExpression(a: number, b: number): number {
    return a << b;
  }
}
