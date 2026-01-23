import { type AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './interfaces';

export class InequalityExpression extends BinaryExpression<boolean> {
   constructor(
      expressionString: string,
      leftExpression: AbstractExpression,
      rightExpression: AbstractExpression
   ) {
      super(
         ExpressionType.Inequality,
         expressionString,
         leftExpression,
         rightExpression
      );
   }

   protected override evaluateExpression(
      a: unknown,
      b: unknown
   ): boolean {
      return a != b;
   }
}
