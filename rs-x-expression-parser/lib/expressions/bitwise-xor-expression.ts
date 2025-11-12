import { AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './interfaces';

export class BitwiseXorExpression extends BinaryExpression<number, number> {
   constructor(
      expressionString: string,
      leftExpression: AbstractExpression<number>,
      rightExpression: AbstractExpression<number>
   ) {
      super(
         ExpressionType.BitwiseXor,
         expressionString,
         leftExpression,
         rightExpression
      );
   }

   protected override evaluateExpression(
      _: AbstractExpression,
      a: number,
      b: number
   ): number {
      return a ^ b;
   }
}
