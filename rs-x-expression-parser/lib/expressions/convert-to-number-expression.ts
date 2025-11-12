import { AbstractExpression } from './abstract-expression';
import { ExpressionType } from './interfaces';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class ConvertToNumberExpression extends ParameterizedExpression<number> {
   constructor(expressionString: string, expression: AbstractExpression) {
      super(ExpressionType.ConvertToNumber, expressionString, expression);
   }

   protected override evaluateExpression(
      _: AbstractExpression,
      a: unknown
   ): number {
      return +a;
   }
}
