import { IExpressionChangeCommitHandler, IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { AbstractExpression, IExpressionInitializeConfig } from './abstract-expression';
import { ExpressionType } from './interfaces';


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

   public override initialize(settings: IExpressionInitializeConfig): AbstractExpression {
      super.initialize(settings);
      this._expressionChangeTransactionManager.registerChange(this.root, this._commitHandler);
      return this;
      
   }

   protected override evaluate(): T {
      return this._value;
   }

   private commit = (root:AbstractExpression, pendingCommits: Set<IExpressionChangeCommitHandler>) => this.reevaluated(this, root, pendingCommits);

}
