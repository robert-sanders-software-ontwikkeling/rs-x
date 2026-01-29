import { type AbstractExpression } from './abstract-expression';
import { ExpressionType } from './expression-parser.interface';
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
