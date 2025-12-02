import { AbstractExpression } from './abstract-expression';
import { ExpressionType } from './interfaces';
import { ParameterizedExpression } from './parameterized-abstract-expression';
import { PropertyExpression } from './property-expression';
import { SpreadExpression } from './spread-expression';

export class ObjectExpression extends ParameterizedExpression<object> {
   constructor(
      expressionString: string,
      propertyExpressions: (PropertyExpression | SpreadExpression)[]
   ) {
      super(
         ExpressionType.Object,
         expressionString,
         ...(propertyExpressions as AbstractExpression[])
      );
   }

   protected evaluateExpression(
      ...args: unknown[]
   ): object {
      return Object.assign({}, ...args);
   }
}
