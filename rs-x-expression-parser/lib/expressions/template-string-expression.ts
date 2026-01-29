import { type AbstractExpression } from './abstract-expression';
import { CollectionExpression } from './collection-expression';
import { ExpressionType } from './expression-parser.interface';

export class TemplateStringExpression extends CollectionExpression<string> {
   constructor(expressionString: string, expressions: AbstractExpression[]) {
      super(ExpressionType.TemlateString, expressionString, expressions);
   }

   public override clone(): this {
      return new (this.constructor as new (
         expressionString: string,
         expressions: AbstractExpression[]
      ) => this)(
         this.expressionString,
         this._childExpressions.map(child => child.clone())
      );
   }

   protected override evaluateExpression(
      ...segments: unknown[]
   ): string {
      return segments.join('');
   }
}
