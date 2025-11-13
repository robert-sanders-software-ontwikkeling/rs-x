import {
   Inject,
   Injectable,
   SingletonFactory,
   SingletonFactoryWithGuid,
} from '@rs-x/core';
import { AbstractExpression } from '../expressions/abstract-expression';
import { IExpressionParser } from '../expressions/interfaces';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';
import {
   IExpressionForContextManager,
   IExpressionInfo,
   IExpressionManager,
} from './expression-manager.type';

class ExpressionForContextManager
   extends SingletonFactory<string, string, AbstractExpression>
   implements IExpressionForContextManager
{
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

   protected override createInstance(expression: string): AbstractExpression {
      return this._expressionParser.parse(this._context, expression, () =>
         this.release(expression)
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
   extends SingletonFactoryWithGuid<
      IExpressionInfo,
      IExpressionForContextManager
   >
   implements IExpressionManager
{
   constructor(
      @Inject(RsXExpressionParserInjectionTokens.IExpressionParser)
      private readonly _expressionParser: IExpressionParser
   ) {
      super();
   }

   protected getGroupId(data: IExpressionInfo): unknown {
      return data.context;
   }

   protected getGroupMemberId(data: IExpressionInfo): unknown {
      return data.expression;
   }

   protected createInstance(
      expressionInfo: IExpressionInfo,
      id: string
   ): IExpressionForContextManager {
      return new ExpressionForContextManager(
         this._expressionParser,
         expressionInfo.context,
         () => this.release(id)
      );
   }
}
