import {
   Inject,
   Injectable,
   SingletonFactory
} from '@rs-x/core';

import type { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import type { IExpressionCache } from '../expression-cache';
import type { IExpression } from '../expressions/expression-parser.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type {
   IExpressionForContextManager,
   IExpressionManager
} from './expression-manager.type';

class ExpressionForContextManager
   extends SingletonFactory<string, string, IExpression>
   implements IExpressionForContextManager {
   constructor(
      private readonly _expressionCache: IExpressionCache,
      private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager,
      private readonly _context: object,
      private readonly releaseContext: () => void
   ) {
      super();
   }

   public override getId(expression: string): string {
      return expression;
   }

   protected override createId(expression: string): string {
      // Ideally, we would normalize the expression string here to avoid duplicates caused by whitespace differences.
      // However, this is a complex task that requires parsing the expression, which is not feasible in this context.
      // Normalization would also need to be fast; otherwise, it defeats the purpose of caching.

      return expression;
   }

   override create(expressionString: string): { referenceCount: number; instance: IExpression<unknown, unknown>; id: string; } {
      const result = super.create(expressionString);

      result.instance.bind({
         rootContext: this._context,
         transactionManager: this._expressionChangeTransactionManager,
         owner: {
            release: () => {
               this.release(result.id);
               this._expressionCache.release(result.id);
            },
            canDispose: () => this.getReferenceCount(result.id) === 1
         }
      });
      this._expressionChangeTransactionManager.commit();

      return result;
   }

   protected override onReleased(): void {
      this.releaseContext();
   }

   protected override createInstance(_: string, id: string): IExpression {
      return this._expressionCache.create(id).instance;
   }
}

@Injectable()
export class ExpressionManager
   extends SingletonFactory<
      object,
      object,
      IExpressionForContextManager
   >
   implements IExpressionManager {
   public override getId(context: object): object {
      return this.createId(context);
   }
   protected override createId(context: object): object {
      return context;
   }
   constructor(
      @Inject(RsXExpressionParserInjectionTokens.IExpressionCache)
      private readonly _expressionCache: IExpressionCache,
      @Inject(RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager)
      private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager,
   ) {
      super();
   }

   protected createInstance(
      context: object,
      id: object
   ): IExpressionForContextManager {
      return new ExpressionForContextManager(
         this._expressionCache,
         this._expressionChangeTransactionManager,
         context,
         () => this.release(id)
      );
   }
}
