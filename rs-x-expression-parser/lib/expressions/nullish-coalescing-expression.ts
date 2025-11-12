import { AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './interfaces';

export class NullishCoalescingExpression extends BinaryExpression {
   constructor(
      expressionString: string,
      leftExpression: AbstractExpression,
      rightExpression: AbstractExpression
   ) {
      super(
         ExpressionType.NullishCoalescing,
         expressionString,
         leftExpression,
         rightExpression
      );
   }

   protected evaluateExpression(
      _sender: AbstractExpression,
      a: unknown,
      b: unknown
   ): unknown {
      return a ?? b;
   }
}
