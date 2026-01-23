import { type ArrayExpression } from './array-expression';
import { type IdentifierExpression } from './identifier-expression';
import { ExpressionType } from './interfaces';
import { type ObjectExpression } from './object-expression';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class SpreadExpression extends ParameterizedExpression<
   unknown[] | object
> {
   constructor(
      expression: ArrayExpression | ObjectExpression | IdentifierExpression
   ) {
      super(
         ExpressionType.Spread,
         `...${expression.expressionString}`,
         expression
      );
   }

   protected override evaluateExpression(
      ...args: unknown[]
   ): unknown[] | object {
      return args[0] as unknown[] | object;
   }
}
