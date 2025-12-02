import { AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './interfaces';

export class ExponentiationExpression extends BinaryExpression<number, number> {
   constructor(
      expressionString: string,
      leftExpression: AbstractExpression<number>,
      rightExpression: AbstractExpression<number>
   ) {
      super(
         ExpressionType.Exponentiation,
         expressionString,
         leftExpression,
         rightExpression
      );
   }

   protected override evaluateExpression(
      base: number,
      exponent: number
   ): number {
      return base ** exponent;
   }
}
