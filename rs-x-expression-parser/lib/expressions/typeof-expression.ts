import { AbstractExpression } from './abstract-expression';
import { ExpressionType } from './interfaces';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class TypeofExpression extends ParameterizedExpression<string> {
   constructor(expressionString: string, expression: AbstractExpression) {
      super(ExpressionType.Typeof, expressionString, expression);
   }

   protected override evaluateExpression(
      _sender: AbstractExpression,
      value: unknown
   ): string {
      return typeof value;
   }
}
