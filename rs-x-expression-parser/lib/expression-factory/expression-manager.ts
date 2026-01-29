import {
   Inject,
   Injectable,
   SingletonFactory
} from '@rs-x/core';

import type { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import type { IExpression, IExpressionParser } from '../expressions/expression-parser.interface';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';

import type {
   IExpressionForContextManager,
   IExpressionManager
} from './expression-manager.type';

class ExpressionForContextManager
   extends SingletonFactory<string, string, IExpression>
   implements IExpressionForContextManager {
   constructor(
      private readonly _expressionParser: IExpressionParser,
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
      return expression;
   }

   protected override createInstance(expressionString: string, id: string): IExpression {
      const expression = this._expressionParser.parse(expressionString);

      expression.bind({
         rootContext: this._context,
         transactionManager: this._expressionChangeTransactionManager,
         owner: {
            release: () => this.release(id),
            canDispose: () => this.getReferenceCount(id) === 1
         }
      });
      this._expressionChangeTransactionManager.commit();

      return expression;
   }

   protected override onReleased(): void {
      if (this.isEmpty) {
         this.releaseContext();
      }
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
      @Inject(RsXExpressionParserInjectionTokens.IExpressionParser)
      private readonly _expressionParser: IExpressionParser,
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
         this._expressionParser,
         this._expressionChangeTransactionManager,
         context,
         () => this.release(id)
      );
   }
}
