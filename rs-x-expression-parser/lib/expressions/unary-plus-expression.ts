import { type AbstractExpression } from './abstract-expression';
import { ExpressionType } from './expression-parser.interface';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class UnaryPlusExpression extends ParameterizedExpression<number> {
   constructor(expressionString: string, expression: AbstractExpression) {
      super(ExpressionType.UnaryPlus, expressionString, expression);
   }

   protected override evaluateExpression(
      a: string|number
   ): number {
      return +a;
   }
}
