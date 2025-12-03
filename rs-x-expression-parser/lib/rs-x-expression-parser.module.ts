import { ContainerModule, InjectionContainer } from '@rs-x/core';
import { RsXStateManagerModule } from '@rs-x/state-manager';


import { JsEspreeExpressionParser } from './js-espree-expression-parser';
import { RsXExpressionParserInjectionTokens } from './rs-x-expression-parser-injection-tokes';
import { IIndexValueObserverManager } from './index-value-observer-manager/index-value-manager-observer.type';
import { IndexValueObserverManager } from './index-value-observer-manager/index-value-observer-manager';
import { IIdentifierOwnerResolver } from './index-value-observer-manager/identifier-owner-resolver.interface';
import { PropertyOwnerResolver } from './index-value-observer-manager/property-owner-resolver';
import { ArrayIndexOwnerResolver } from './index-value-observer-manager/array-index-owner-resolver';
import { MapKeyOwnerResolver } from './index-value-observer-manager/map-key-owner-resolver';
import { DefaultIdentifierOwnerResolver } from './index-value-observer-manager/default-identifier-owner-resolver';
import { IExpressionChangeTransactionManager } from './expresion-change-transaction-manager.interface';
import { ExpressionChangeTransactionManager } from './expresion-change-transaction-manager';
import { ExpressionManager } from './expression-factory/expression-manager';
import { IExpressionParser } from './expressions/interfaces';
import { IExpressionManager } from './expression-factory/expression-manager.type';
import { IExpressionFactory } from './expression-factory/expression-factory.interface';
import { ExpressionFactory } from './expression-factory/expression-factory';

InjectionContainer.load(RsXStateManagerModule);

export const RsXExpressionParserModule = new ContainerModule((options) => {
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
      .bind<IIndexValueObserverManager>(
         RsXExpressionParserInjectionTokens.IIndexValueObserverManager
      )
      .to(IndexValueObserverManager)
      .inSingletonScope();
   options
      .bind<IExpressionManager>(
         RsXExpressionParserInjectionTokens.IExpressionManager
      )
      .to(ExpressionManager)
      .inSingletonScope();
   options
      .bind<IIdentifierOwnerResolver>(
         RsXExpressionParserInjectionTokens.PropertyOwnerResolver
      )
      .to(PropertyOwnerResolver)
      .inSingletonScope();
   options
      .bind<IIdentifierOwnerResolver>(
         RsXExpressionParserInjectionTokens.ArrayIndexOwnerResolver
      )
      .to(ArrayIndexOwnerResolver)
      .inSingletonScope();
   options
      .bind<IIdentifierOwnerResolver>(
         RsXExpressionParserInjectionTokens.MapKeyOwnerResolver
      )
      .to(MapKeyOwnerResolver)
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
});

export async function unloadRsXExpressionParserModule(): Promise<void> {
   await InjectionContainer.unload(RsXStateManagerModule);
   await InjectionContainer.unload(RsXExpressionParserModule);
}
