import { type AbstractExpression } from './abstract-expression';
import { ExpressionType } from './interfaces';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class UnaryNegationExpression extends ParameterizedExpression<number> {
   constructor(
      expressionString: string,
      expression: AbstractExpression<number>
   ) {
      super(ExpressionType.UnaryNegation, expressionString, expression);
   }

   protected override evaluateExpression(
      value: number
   ): number {
      return -value;
   }
}
