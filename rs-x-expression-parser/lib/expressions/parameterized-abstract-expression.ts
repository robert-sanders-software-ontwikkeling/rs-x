import {
   AbstractExpression,
} from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { type ExpressionType } from './interfaces';

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

   public override bind(
      settings: IExpressionBindConfiguration
   ): AbstractExpression {
      super.bind(settings);
      this._childExpressions.forEach((childExpression) => {
         childExpression.bind(settings);
      });
      return this;
   }

   protected abstract evaluateExpression(...args: unknown[]): T;

   protected override prepareReevaluation(): boolean {
      const args = this._childExpressions.map(childExpression => childExpression.value);

      if (args.some(arg => arg === undefined)) {
         return false;
      }

      return true;
   }

   protected override evaluate(): T {
      const args = this._childExpressions.map(childExpression => childExpression.value);
      return this.evaluateExpression(...args)
   }
}
