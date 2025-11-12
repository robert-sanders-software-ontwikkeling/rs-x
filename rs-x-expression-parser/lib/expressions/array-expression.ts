import { CollectionExpression } from './collection-expression';
import { ExpressionType } from './interfaces';
import { AbstractExpression } from './abstract-expression';

export class ArrayExpression extends CollectionExpression<unknown[]> {
   constructor(expressions: AbstractExpression[]) {
      super(
         ExpressionType.Array,
         `[${expressions.map((expression) => expression.expressionString).join(', ')}]`,
         expressions
      );
   }

   protected override evaluateExpression(
      _: AbstractExpression,
      ...args: unknown[]
   ): unknown[] {
      const array = [];

      args.forEach((item, i) => {
         if (this.childExpressions[i].type === ExpressionType.Spread) {
            array.push(...(item as Array<unknown>));
         } else {
            array.push(item);
         }
      });

      return array;
   }
}
