import { type AbstractExpression } from './abstract-expression';
import { ExpressionType } from './expression-parser.interface';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class TypeofExpression extends ParameterizedExpression<string> {
   constructor(expressionString: string, expression: AbstractExpression) {
      super(ExpressionType.Typeof, expressionString, expression);
   }

   public override clone(): this {
      return new (this.constructor as new (
         expressionString: string,
         expression: AbstractExpression
      ) => this)(
         this.expressionString,
         this._childExpressions[0].clone()
      );
   }

   protected override evaluateExpression(
      value: unknown
   ): string {
      return typeof value;
   }
}
