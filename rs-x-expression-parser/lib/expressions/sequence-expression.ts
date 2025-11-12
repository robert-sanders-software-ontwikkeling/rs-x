import {
   AbstractExpression,
   IExpressionInitializeConfig,
} from './abstract-expression';
import { ExpressionType } from './interfaces';

export class SequenceExpression extends AbstractExpression {
   constructor(expressionString: string, expressions: AbstractExpression[]) {
      super(ExpressionType.Sequence, expressionString, ...expressions);
   }

   public override initialize(
      settings: IExpressionInitializeConfig
   ): AbstractExpression {
      super.initialize(settings);
      this._childExpressions.forEach((childExpression) =>
         childExpression.initialize(settings)
      );

      return this;
   }

   protected override evaluateExpression(): unknown {
      const childExpression = this._childExpressions;
      return childExpression[childExpression.length - 1].value;
   }
}
