import { type AbstractExpression } from './abstract-expression';
import { ExpressionType } from './expression-parser.interface';
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
      a: number
   ): number {
      return ~a;
   }
}
