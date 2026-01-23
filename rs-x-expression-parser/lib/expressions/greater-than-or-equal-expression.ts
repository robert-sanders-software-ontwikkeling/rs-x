import { type AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './interfaces';

export class GreaterThanOrEqualExpression extends BinaryExpression {
   constructor(
      expressionString: string,
      leftExpression: AbstractExpression,
      rightExpression: AbstractExpression
   ) {
      super(
         ExpressionType.GreaterThanOrEqual,
         expressionString,
         leftExpression,
         rightExpression
      );
   }

   protected override evaluateExpression(
      a: number,
      b: number
   ): boolean {
      return a >= b;
   }
}
