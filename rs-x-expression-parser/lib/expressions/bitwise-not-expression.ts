import { AbstractExpression } from './abstract-expression';
import { ExpressionType } from './interfaces';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class BitwiseNotExpression extends ParameterizedExpression<
   number,
   number
> {
   constructor(
      expressionString: string,
      expression: AbstractExpression<number>
   ) {
      super(ExpressionType.BitwiseNot, expressionString, expression);
   }

   protected override evaluateExpression(
      _: AbstractExpression,
      a: number
   ): number {
      return ~a;
   }
}
