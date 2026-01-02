import { AnyFunction, Assertion, PENDING } from '@rs-x/core';
import { IGuidFactory } from '../../../rs-x-core/lib/guid';
import { IStateManager } from '../../../rs-x-state-manager/lib';
import { IExpressionChangeCommitHandler, IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import {
   AbstractExpression,
   IExpressionInitializeConfig,
} from './abstract-expression';
import { ArrayExpression } from './array-expression';
import { ConstantNullExpression } from './constant-null-expression';
import { ExpressionType } from './interfaces';

export class FunctionExpression extends AbstractExpression {
   private _context: unknown;
   private _functionContext: unknown;
   private readonly _functionId: string;

   constructor(
      expressionString: string,
      public readonly functionExpression: AbstractExpression<
         AnyFunction | string | number
      >,
      public readonly objectExpression: AbstractExpression<object>,
      public readonly argumentsExpression: ArrayExpression,
      public readonly computed: boolean,
      public readonly optional: boolean,
      expressionChangeTransactionManager: IExpressionChangeTransactionManager,
      private readonly _stateManager: IStateManager,
      guidFactory: IGuidFactory
   ) {
      super(
         ExpressionType.Function,
         expressionString,
         objectExpression ?? new ConstantNullExpression(expressionChangeTransactionManager),
         functionExpression,
         argumentsExpression
      );

      this._functionId = guidFactory.create();
   }

   public override initialize(
      settings: IExpressionInitializeConfig
   ): AbstractExpression {
      this._context = settings.context;
      super.initialize(settings);
      if (this.objectExpression) {
         this.objectExpression.initialize(settings);
         if (this.computed) {
            this.functionExpression.initialize(settings);
         }
      } else if(this.functionExpression.type !== ExpressionType.Identifier) {
         this.functionExpression.initialize(settings);
      }

      this.argumentsExpression.initialize(settings);

      return this;
   }

   protected override internalDispose(): void {
      this.releaseResult();
   }

   protected override prepareReevaluation(sender: AbstractExpression, root: AbstractExpression, pendingCommits: Set<IExpressionChangeCommitHandler>): boolean {
      if (sender === this.functionExpression
         || sender === this.objectExpression ||
         sender === this.argumentsExpression) {
         super.prepareReevaluation(this, root, pendingCommits);
         return true
      }

      return super.prepareReevaluation(sender, root, pendingCommits);
   }

   protected override evaluate(): unknown {
      const functionContext = this.objectExpression ? this.objectExpression?.value : this._context;
      if (!functionContext) {
         return PENDING;
      }

      if (this._functionContext !== functionContext) {
         this._functionContext = functionContext;
      }

      const {
         functionName,
         argumentsExpression,
      } = this;


      const args = argumentsExpression.value;

      if (!functionName || !args || !functionContext) {
         return PENDING;
      }

      const func = functionContext[functionName];
      Assertion.assertIsFunction(func, func.name);

      return this.registerResult(func.call(functionContext, ...args));
   }

   private get functionName(): string {
      return this.computed
         ? this.functionExpression.value as string
         : this.functionExpression.expressionString;
   }

   private releaseResult(): void {
      this._stateManager.releaseState(this._functionContext, this._functionId);
      this._functionContext = undefined;
   }


   private registerResult(result: unknown): unknown {
      this._stateManager.setState(this._functionContext, this._functionId, result);
      return result
   }
}
