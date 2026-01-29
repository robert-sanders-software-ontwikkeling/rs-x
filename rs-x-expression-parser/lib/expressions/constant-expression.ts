import { type IExpressionChangeCommitHandler, type IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { type ExpressionType } from './interfaces';


export class ConstantExpression<T> extends AbstractExpression<T> {
   private readonly _commitHandler: IExpressionChangeCommitHandler;
   constructor(
      type: ExpressionType,
      expressionString: string,
      constValue: T,
      private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager,

      
   ) {
      super(type, expressionString);
       this._commitHandler = {
         owner: this,
         commit: this.commit
      };
      this._value = constValue;
   }

   public override bind(settings: IExpressionBindConfiguration): AbstractExpression {
      super.bind(settings);
      this._expressionChangeTransactionManager.registerChange(this.root, this._commitHandler);
      return this;
   }

   protected override evaluate(): T | undefined {
      return this._value;
   }

   private commit = (root:AbstractExpression, pendingCommits: Set<IExpressionChangeCommitHandler>) => this.reevaluated(this, root, pendingCommits);

}
