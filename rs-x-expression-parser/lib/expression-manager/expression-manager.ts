import {
   Inject,
   Injectable,
   SingletonFactory
} from '@rs-x/core';
import { AbstractExpression } from '../expressions/abstract-expression';
import { IExpressionParser } from '../expressions/interfaces';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';
import {
   IExpressionForContextManager,
   IExpressionManager
} from './expression-manager.type';

class ExpressionForContextManager
   extends SingletonFactory<string, string, AbstractExpression>
   implements IExpressionForContextManager {
   constructor(
      private readonly _expressionParser: IExpressionParser,
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

   protected override createInstance(expression: string, id: string): AbstractExpression {
      return this._expressionParser.parse(this._context, expression, {
         release: () => this.release(id),
         canDispose: () => this.getReferenceCount(id) === 1
      }
      );
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
      private readonly _expressionParser: IExpressionParser
   ) {
      super();
   }


   protected createInstance(
      context: object,
      id: object
   ): IExpressionForContextManager {
      return new ExpressionForContextManager(
         this._expressionParser,
         context,
         () => this.release(id)
      );
   }
}
