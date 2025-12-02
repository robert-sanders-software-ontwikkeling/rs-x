import { AbstractExpression } from './abstract-expression';
import { ArrayExpression } from './array-expression';
import { IdentifierExpression } from './identifier-expression';
import { ExpressionType } from './interfaces';
import { ObjectExpression } from './object-expression';
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
