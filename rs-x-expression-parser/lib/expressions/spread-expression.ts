import { type ArrayExpression } from './array-expression';
import { ExpressionType } from './expression-parser.interface';
import { type IdentifierExpression } from './identifier-expression';
import { type ObjectExpression } from './object-expression';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class SpreadExpression extends ParameterizedExpression<unknown[] | object> {
   constructor(
      expression: ArrayExpression | ObjectExpression | IdentifierExpression
   ) {
      super(
         ExpressionType.Spread,
         `...${expression.expressionString}`,
         expression
      );
   }

   public override clone(): this {
      return new (this.constructor as new (
         expression: ArrayExpression | ObjectExpression | IdentifierExpression
      ) => this)(
         this._childExpressions[0].clone() as  ArrayExpression | ObjectExpression | IdentifierExpression
      );
   }

   protected override evaluateExpression(
      ...args: unknown[]
   ): unknown[] | object {
      return args[0] as unknown[] | object;
   }
}
