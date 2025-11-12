import { AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './interfaces';

export class MultiplicationExpression extends BinaryExpression {
   constructor(
      expressionString: string,
      leftExpression: AbstractExpression<number>,
      rightExpression: AbstractExpression<number>
   ) {
      super(
         ExpressionType.Multiplication,
         expressionString,
         leftExpression,
         rightExpression
      );
   }

   protected override evaluateExpression(
      _sender: AbstractExpression,
      a: number,
      b: number
   ): number {
      return a * b;
   }
}
