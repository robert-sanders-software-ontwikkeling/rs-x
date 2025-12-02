import { AnyFunction, Assertion } from '@rs-x/core';
import {
   AbstractExpression,
   IExpressionInitializeConfig,
} from './abstract-expression';
import { ArrayExpression } from './array-expression';
import { ConstantNullExpression } from './constant-null-expression';
import { ExpressionType } from './interfaces';
import { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';

export class FunctionExpression extends AbstractExpression {
   private _context: unknown;
   constructor(
      expressionString: string,
      public readonly functionExpression: AbstractExpression<
         AnyFunction | string | number
      >,
      public readonly objectExpression: AbstractExpression<object>,
      public readonly argumentsExpression: ArrayExpression,
      public readonly computed: boolean,
      public readonly optional: boolean,
      expressionChangeTransactionManager: IExpressionChangeTransactionManager
   ) {
      super(
         ExpressionType.Function,
         expressionString,
         objectExpression ?? new ConstantNullExpression(expressionChangeTransactionManager),
         functionExpression,
         argumentsExpression
      );
   }

   public override initialize(
      settings: IExpressionInitializeConfig
   ): AbstractExpression {
      super.initialize(settings);
      if (this.objectExpression) {
         this.objectExpression.initialize(settings);
         if (this.computed) {
            this.functionExpression.initialize(settings);
         }
      } else {
         this._context = settings.context;
         this.functionExpression.initialize(settings);
      }

      this.argumentsExpression.initialize(settings);

      return this;
   }

   protected override evaluate(sender: AbstractExpression): unknown {
      if (
         sender === this.objectExpression &&
         this.objectExpression.value &&
         !this.computed
      ) {
         // Must run after the current evaluate() finishes.
         // Running this.functionExpression.initialize() immediately could trigger a nested evaluate(),
         // so we defer it until the current call has fully returned.
         queueMicrotask(() => {
            this.functionExpression.initialize({
               context: this.objectExpression.value,
            });
         });

         return undefined
      }

      const {
         functionExpression,
         argumentsExpression,
         objectExpression,
         _context,
      } = this;

      const context = objectExpression?.value ?? _context;
      const func = this.computed
         ? (context?.[functionExpression.value as string] as AnyFunction)
         : (functionExpression.value as AnyFunction);
      const args = argumentsExpression.value;

      if (!func || !args || !context) {
         return;
      }

      Assertion.assertIsFunction(func, func.name);
      return func.call(context, ...args);
   }
}
