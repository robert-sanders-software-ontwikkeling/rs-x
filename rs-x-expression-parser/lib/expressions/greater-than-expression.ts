import { AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './interfaces';

export class GreaterThanExpression extends BinaryExpression {
   constructor(
      expressionString: string,
      leftExpression: AbstractExpression,
      rightExpression: AbstractExpression
   ) {
      super(
         ExpressionType.GreaterThan,
         expressionString,
         leftExpression,
         rightExpression
      );
   }

   protected override evaluateExpression(
      _: AbstractExpression,
      a: number,
      b: number
   ): boolean {
      return a > b;
   }
}
