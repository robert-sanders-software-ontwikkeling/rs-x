import { AbstractExpression } from './abstract-expression';
import { ExpressionType } from './interfaces';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class ConditionalExpression extends ParameterizedExpression {
   constructor(
      expressionString: string,
      condition: AbstractExpression,
      ifValueExpression: AbstractExpression,
      elseValueExpression: AbstractExpression
   ) {
      super(
         ExpressionType.Conditional,
         expressionString,
         condition,
         ifValueExpression,
         elseValueExpression
      );
   }

   protected override evaluateExpression(
      condition: unknown,
      consequent: unknown,
      alternate: unknown
   ): unknown {
      return condition ? consequent : alternate;
   }
}
