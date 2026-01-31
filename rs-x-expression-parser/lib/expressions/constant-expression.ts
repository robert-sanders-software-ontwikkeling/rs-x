import { type IExpressionChangeCommitHandler } from '../expresion-change-transaction-manager.interface';

import { AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { type ExpressionType } from './expression-parser.interface';


export class ConstantExpression<T> extends AbstractExpression<T> {
   private readonly _commitHandler: IExpressionChangeCommitHandler;
   constructor(
      type: ExpressionType,
      expressionString: string,
      constValue: T

      
   ) {
      super(type, expressionString);
       this._commitHandler = {
         owner: this,
         commit: this.commit
      };
      this._value = constValue;
   }

   public override clone(): this {
      return new (this.constructor as new (
         constValue: T,
      ) => this)(
         this._value as T,
      );
   }

   public override bind(settings: IExpressionBindConfiguration): AbstractExpression {
      super.bind(settings);
      this.transactionManager.registerChange(this.root, this._commitHandler);
      return this;
   }

   protected override evaluate(): T | undefined {
      return this._value;
   }

   private commit = (root:AbstractExpression, pendingCommits: Set<IExpressionChangeCommitHandler>) => this.reevaluated(this, root, pendingCommits);

}
