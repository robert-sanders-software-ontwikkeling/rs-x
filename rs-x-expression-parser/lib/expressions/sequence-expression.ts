import {
   AbstractExpression
} from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';

export class SequenceExpression extends AbstractExpression {
   constructor(expressionString: string, expressions: AbstractExpression[]) {
      super(ExpressionType.Sequence, expressionString, ...expressions);
   }

   public override bind(
      settings: IExpressionBindConfiguration
   ): AbstractExpression {
      super.bind(settings);
      this._childExpressions.forEach((childExpression) =>
         childExpression.bind(settings)
      );

      return this;
   }

   protected override evaluate(): unknown {
      const childExpression = this._childExpressions;
      return childExpression[childExpression.length - 1].value;
   }
}
