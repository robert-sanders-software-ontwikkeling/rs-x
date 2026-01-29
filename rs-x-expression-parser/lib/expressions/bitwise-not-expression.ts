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

   public override clone(): this {
      return new (this.constructor as new (
         expressionString: string,
         expression: AbstractExpression<number>
      ) => this)(
         this.expressionString,
         this._childExpressions[0].clone() as  AbstractExpression<number>
      );
   }

   protected override evaluateExpression(
      a: number
   ): number {
      return ~a;
   }
}
