import { AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './interfaces';

export class LessThanExpression extends BinaryExpression<boolean> {
   constructor(
      expressionString: string,
      leftExpression: AbstractExpression<number>,
      rightExpression: AbstractExpression<number>
   ) {
      super(
         ExpressionType.LessThan,
         expressionString,
         leftExpression,
         rightExpression
      );
   }

   protected override evaluateExpression(
      a: number,
      b: number
   ): boolean {
      return a < b;
   }
}
