import { type AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './expression-parser.interface';

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
      a: unknown,
      b: unknown
   ): unknown {
      return a ?? b;
   }
}
