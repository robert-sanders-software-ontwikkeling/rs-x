import {
   IErrorLog,

   Inject,
   InjectionContainer,
   KeyedInstanceFactory,
   RsXCoreInjectionTokens,

} from '@rs-x/core';
import { injectable } from 'inversify';
import {

   ICustomElementConnector,
} from '../interfaces';
import { BindingManager } from './binding-manager';
import { IBindingsParser } from './interfaces';
import { IBindingManager } from './binding-manager.interface';
import { RsXUIInjectionTokens } from '../../rx-x-ui.injection-tokens';
import { IInputContext } from '../decorators/input/input-context.interface';
import { IExpressionFactory, RsXExpressionParserInjectionTokens } from '@rs-x/expression-parser';

@injectable()
export class BindingManagerFactory extends KeyedInstanceFactory<
   ICustomElementConnector | Element,
   ICustomElementConnector | Element,
   IBindingManager
> {
   constructor(
      @Inject(RsXUIInjectionTokens.IInputContext)
      private readonly _inputMetadataContext: IInputContext,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      private readonly _errorLog: IErrorLog,
      @Inject(RsXUIInjectionTokens.IBindingsParser)
      private readonly _bindingsParser: IBindingsParser,
      @Inject(RsXExpressionParserInjectionTokens.IExpressionFactory)
      private readonly _expressionFactory: IExpressionFactory
   ) {
      super();
   }

   public getId(
      element: ICustomElementConnector | Element
   ): ICustomElementConnector | Element {
      return element;
   }

   protected createId(
      element: ICustomElementConnector | Element
   ): ICustomElementConnector | Element {
      return element;
   }

   protected createInstance(
      element: ICustomElementConnector | Element
   ): IBindingManager {
      return new BindingManager(
         element,
         this._inputMetadataContext,
         InjectionContainer.get(RsXUIInjectionTokens.IBindingCollection),
         this._errorLog,
         this._bindingsParser,
         this._expressionFactory
      );
   }
}
