import { AbstractExpression } from './abstract-expression';
import { ExpressionType } from './interfaces';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class LogicalNotExpression extends ParameterizedExpression {
   constructor(expressionString: string, expression: AbstractExpression) {
      super(ExpressionType.Not, expressionString, expression);
   }

   protected override evaluateExpression(
      value: unknown
   ): boolean {
      return !value;
   }
}
