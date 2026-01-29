import { type AbstractExpression } from './abstract-expression';
import { ExpressionType } from './expression-parser.interface';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class UnaryNegationExpression extends ParameterizedExpression<number> {
   constructor(
      expressionString: string,
      expression: AbstractExpression<number>
   ) {
      super(ExpressionType.UnaryNegation, expressionString, expression);
   }

   public override clone(): this {
      return new (this.constructor as new (
         expressionString: string,
         expression: AbstractExpression<number>
      ) => this)(
         this.expressionString,
         this._childExpressions[0].clone() as AbstractExpression<number>
      );
   }

   protected override evaluateExpression(
      value: number
   ): number {
      return -value;
   }
}
