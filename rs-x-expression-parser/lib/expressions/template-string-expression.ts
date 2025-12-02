import { AbstractExpression } from './abstract-expression';
import { CollectionExpression } from './collection-expression';
import { ExpressionType } from './interfaces';

export class TemplateStringExpression extends CollectionExpression<string> {
   constructor(expressionString: string, expressions: AbstractExpression[]) {
      super(ExpressionType.TemlateString, expressionString, expressions);
   }

   protected override evaluateExpression(
      ...segments: unknown[]
   ): string {
      return segments.join('');
   }
}
