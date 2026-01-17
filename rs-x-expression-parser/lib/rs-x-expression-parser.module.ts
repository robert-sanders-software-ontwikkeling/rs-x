import { ContainerModule, InjectionContainer, registerMultiInjectServices } from '@rs-x/core';
import { RsXStateManagerModule } from '@rs-x/state-manager';
import { ExpressionChangeTransactionManager } from './expresion-change-transaction-manager';
import { IExpressionChangeTransactionManager } from './expresion-change-transaction-manager.interface';
import { ExpressionFactory } from './expression-factory/expression-factory';
import { IExpressionFactory } from './expression-factory/expression-factory.interface';
import { ExpressionManager } from './expression-factory/expression-manager';
import { IExpressionManager } from './expression-factory/expression-manager.type';
import { IExpressionParser } from './expressions/interfaces';
import { ArrayIndexOwnerResolver } from './identifier-owner-resolver/array-index-owner-resolver';
import { DefaultIdentifierOwnerResolver } from './identifier-owner-resolver/default-identifier-owner-resolver';
import { IIdentifierOwnerResolver } from './identifier-owner-resolver/identifier-owner-resolver.interface';
import { MapKeyOwnerResolver } from './identifier-owner-resolver/map-key-owner-resolver';
import { PropertyOwnerResolver } from './identifier-owner-resolver/property-owner-resolver';
import { JsEspreeExpressionParser } from './js-espree-expression-parser';
import { RsXExpressionParserInjectionTokens } from './rs-x-expression-parser-injection-tokes';

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

   registerMultiInjectServices(options, RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList,
      [
         { target: PropertyOwnerResolver, token: RsXExpressionParserInjectionTokens.PropertyOwnerResolver },
         { target: ArrayIndexOwnerResolver, token: RsXExpressionParserInjectionTokens.ArrayIndexOwnerResolver },
         { target: MapKeyOwnerResolver, token: RsXExpressionParserInjectionTokens.MapKeyOwnerResolver },
      ]
   );
});


export async function unloadRsXExpressionParserModule(): Promise<void> {
   await InjectionContainer.unload(RsXStateManagerModule);
   await InjectionContainer.unload(RsXExpressionParserModule);
}
