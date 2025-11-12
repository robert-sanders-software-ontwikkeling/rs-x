import {
   AbstractExpression,
   IExpressionInitializeConfig,
} from './abstract-expression';
import { ExpressionType } from './interfaces';

export abstract class ParameterizedExpression<
   T = unknown,
   PT = unknown,
> extends AbstractExpression<T, PT> {
   protected constructor(
      type: ExpressionType,
      expressionString: string,
      ...childExpressions: AbstractExpression[]
   ) {
      super(type, expressionString, ...childExpressions);
   }

   public override initialize(
      settings: IExpressionInitializeConfig
   ): AbstractExpression {
      super.initialize(settings);
      this._childExpressions.forEach((childExpression) => {
         childExpression.initialize(settings);
      });
      return this;
   }

   protected override evaluate(sender: AbstractExpression): void {
      const args = this.evaluateChildExpression();
      if (!args) {
         return undefined;
      }

      super.evaluate(sender, ...args);
   }

   private get allChildExpressionsHaveAValue(): boolean {
      return this._childExpressions.every(
         (childExpression) => childExpression.value !== undefined
      );
   }

   private evaluateChildExpression(): unknown[] {
      if (!this.allChildExpressionsHaveAValue) {
         return undefined;
      }
      return this._childExpressions.map(
         (childExpression) => childExpression.value
      );
   }
}
