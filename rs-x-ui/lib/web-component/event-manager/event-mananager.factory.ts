import { IErrorLog, Inject, Injectable, KeyedInstanceFactory, RsXCoreInjectionTokens } from '@rs-x/core';
import { IExpressionParser, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';
import { RsXUIInjectionTokens } from '../../rx-x-ui.injection-tokens';
import { IOutputContext } from '../decorators/output/output-context.interface';
import { EventManager } from './event-manager';
import { IEventIdentifierResolver } from './event-identifier-resolver.interface';
import { IEventManagerContext } from './event-manager-context.interface';
import { IEventManager } from './event-manager.interface';
import { IEventObserver } from './event-observer.interface';

@Injectable()
export class EventManagerFactory extends KeyedInstanceFactory<
   Element,
   IEventManagerContext,
   IEventManager
> {
   constructor(
      @Inject(RsXUIInjectionTokens.IOutputContext)
      private readonly _outputContext: IOutputContext,
      @Inject(RsXUIInjectionTokens.IEventIdentifierResolver)
      private readonly _eventIdentifierResolver: IEventIdentifierResolver,
      @Inject(RsXExpressionParserInjectionTokens.IExpressionParser)
      private readonly _expressionParser: IExpressionParser,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      private readonly _errorLog: IErrorLog,
      @Inject(RsXUIInjectionTokens.IEventObserver)
      private readonly _eventObserver: IEventObserver
   ) {
      super();
   }

   public getId(context: IEventManagerContext): Element {
      return context.element;
   }

   protected createId(context: IEventManagerContext): Element {
      return context.element;
   }

   protected createInstance(context: IEventManagerContext): IEventManager {
      return new EventManager(
         context,
         this._outputContext,
         this._eventIdentifierResolver,
         this._expressionParser,
         this._errorLog,
         this._eventObserver
      );
   }
}
