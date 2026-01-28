import { 
   ContainerModule, 
   defaultIndexValueAccessorList, 
   type IDeepCloneExcept, 
   InjectionContainer, 
   overrideMultiInjectServices, 
   registerMultiInjectServices,
   RsXCoreInjectionTokens 
} from '@rs-x/core';
import { defaultObjectObserverProxyPairFactoryList, RsXStateManagerInjectionTokens, RsXStateManagerModule } from '@rs-x/state-manager';
import { ExpressionChangeTransactionManager } from './expresion-change-transaction-manager';
import type { IExpressionChangeTransactionManager } from './expresion-change-transaction-manager.interface';
import { ExpressionFactory } from './expression-factory/expression-factory';
import type { IExpressionFactory } from './expression-factory/expression-factory.interface';
import { ExpressionManager } from './expression-factory/expression-manager';
import type { IExpressionManager } from './expression-factory/expression-manager.type';
import { DeepCloneExceptWithExpressionSupport } from './expression-observer/deep-clone-except-with-expression-support';
import { ExpressionObserverFactory } from './expression-observer/expression-observer.factory';
import type { IExpressionObserverFactory } from './expression-observer/expression-proxy.factory.type';
import type { IExpressionParser } from './expressions/interfaces';
import { ArrayIndexOwnerResolver } from './identifier-owner-resolver/array-index-owner-resolver';
import { DefaultIdentifierOwnerResolver } from './identifier-owner-resolver/default-identifier-owner-resolver';
import type { IIdentifierOwnerResolver } from './identifier-owner-resolver/identifier-owner-resolver.interface';
import { MapKeyOwnerResolver } from './identifier-owner-resolver/map-key-owner-resolver';
import { PropertyOwnerResolver } from './identifier-owner-resolver/property-owner-resolver';
import { JsEspreeExpressionParser } from './js-espree-expression-parser';
import { RsXExpressionParserInjectionTokens } from './rs-x-expression-parser-injection-tokes';
import { ExpressionObserverProxyPairFactory } from './expression-observer/expression-observer-proxy-pair.factory';
import { ExpressionIndexAccessor } from './expression-observer/expression-index-accessor';

InjectionContainer.load(RsXStateManagerModule);

export const RsXExpressionParserModule = new ContainerModule((options) => {
   options.unbind(RsXCoreInjectionTokens.DefaultDeepCloneExcept);
   options
      .bind<IDeepCloneExcept>(
         RsXCoreInjectionTokens.DefaultDeepCloneExcept
      )
      .to(DeepCloneExceptWithExpressionSupport)
      .inSingletonScope();
   options
      .bind<IExpressionChangeTransactionManager>(
         RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager
      )
      .to(ExpressionChangeTransactionManager)
      .inSingletonScope();
   options
      .bind<IExpressionParser>(
         RsXExpressionParserInjectionTokens.IExpressionParser
      )
      .to(JsEspreeExpressionParser)
      .inSingletonScope();
   options
      .bind<IExpressionManager>(
         RsXExpressionParserInjectionTokens.IExpressionManager
      )
      .to(ExpressionManager)
      .inSingletonScope();
   options
      .bind<IIdentifierOwnerResolver>(
         RsXExpressionParserInjectionTokens.IdentifierOwnerResolver
      )
      .to(DefaultIdentifierOwnerResolver)
      .inSingletonScope();
   options
      .bind<IExpressionFactory>(
         RsXExpressionParserInjectionTokens.IExpressionFactory
      )
      .to(ExpressionFactory)
      .inSingletonScope();
   options
      .bind<IExpressionObserverFactory>(
         RsXExpressionParserInjectionTokens.IExpressionObserverFactory
      )
      .to(ExpressionObserverFactory)
      .inSingletonScope();

   registerMultiInjectServices(options, RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList,
      [
         { target: PropertyOwnerResolver, token: RsXExpressionParserInjectionTokens.PropertyOwnerResolver },
         { target: ArrayIndexOwnerResolver, token: RsXExpressionParserInjectionTokens.ArrayIndexOwnerResolver },
         { target: MapKeyOwnerResolver, token: RsXExpressionParserInjectionTokens.MapKeyOwnerResolver },
      ]
   );


   overrideMultiInjectServices(options, RsXCoreInjectionTokens.IIndexValueAccessorList, [
      { target: ExpressionIndexAccessor, token: RsXExpressionParserInjectionTokens.IExpressionIndexAccessor },
      ...defaultIndexValueAccessorList
   ])

   overrideMultiInjectServices(options, RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList, [
      { target: ExpressionObserverProxyPairFactory, token: RsXExpressionParserInjectionTokens.IExpressionObserverProxyPairFactory },
      ...defaultObjectObserverProxyPairFactoryList
   ])
});


export async function unloadRsXExpressionParserModule(): Promise<void> {
   await InjectionContainer.unload(RsXStateManagerModule);
   await InjectionContainer.unload(RsXExpressionParserModule);
}
