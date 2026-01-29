import { type AbstractExpression } from './abstract-expression';
import { ExpressionType } from './expression-parser.interface';
import { ParameterizedExpression } from './parameterized-abstract-expression';
import { type PropertyExpression } from './property-expression';
import { type SpreadExpression } from './spread-expression';

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

    public override clone(): this {
      return new (this.constructor as new (
         expressionString: string,
         propertyExpressions: (PropertyExpression | SpreadExpression)[]
      ) => this)(
         this.expressionString,
         this._childExpressions.map(child => child.clone()) as (PropertyExpression | SpreadExpression)[]
      );
   }

   protected evaluateExpression(
      ...args: unknown[]
   ): object {
      return Object.assign({}, ...args);
   }
}
