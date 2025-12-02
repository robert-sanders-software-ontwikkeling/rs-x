import { AbstractExpression } from './abstract-expression';
import { ExpressionType } from './interfaces';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class UnaryPlusExpression extends ParameterizedExpression<number> {
   constructor(expressionString: string, expression: AbstractExpression) {
      super(ExpressionType.UnaryPlus, expressionString, expression);
   }

   protected override evaluateExpression(
      a: unknown
   ): number {
      return +a;
   }
}
