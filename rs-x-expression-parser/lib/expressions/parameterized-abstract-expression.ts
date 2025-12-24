import { send } from 'process';
import { IExpressionChangeCommitHandler } from '../expresion-change-transaction-manager.interface';
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

   protected abstract evaluateExpression(...args: unknown[]): T;

   protected override prepareReevaluation(_sender: AbstractExpression, root: AbstractExpression, pendingCommits: Set<IExpressionChangeCommitHandler>): boolean {
      const args = this._childExpressions.map(childExpression => childExpression.value);

      if (args.some(arg => arg === undefined)) {
         return false;
      }

      return super.prepareReevaluation(this,root, pendingCommits);
   }

   protected override evaluate(): T {
      const args = this._childExpressions.map(childExpression => childExpression.value);
      return this.evaluateExpression(...args)
   }
}
