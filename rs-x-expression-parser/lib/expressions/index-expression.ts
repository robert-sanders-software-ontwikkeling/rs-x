import { AbstractExpression } from './abstract-expression';
import { ExpressionType } from './interfaces';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class IndexExpression extends ParameterizedExpression {
   constructor(expression: AbstractExpression) {
      super(ExpressionType.Index, `[${expression}]`, expression);
   }

   protected evaluateExpression(
      _: AbstractExpression,
      index: unknown
   ): unknown {
      return index;
   }
}
