import { AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './interfaces';

export class SubtractionExpression extends BinaryExpression<number, number> {
   constructor(
      expressionString: string,
      leftExpression: AbstractExpression<number>,
      rightExpression: AbstractExpression<number>
   ) {
      super(
         ExpressionType.Subtraction,
         expressionString,
         leftExpression,
         rightExpression
      );
   }

   protected override evaluateExpression(
      a: number,
      b: number
   ): number {
      return a - b;
   }
}
