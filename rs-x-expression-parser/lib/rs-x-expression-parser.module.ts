import {
  ContainerModule,
  defaultIndexValueAccessorList,
  defaultValueMetadataList,
  type IDeepCloneExcept,
  InjectionContainer,
  overrideMultiInjectServices,
  registerMultiInjectServices,
  RsXCoreInjectionTokens,
} from '@rs-x/core';
import {
  defaultObjectObserverProxyPairFactoryList,
  RsXStateManagerInjectionTokens,
  RsXStateManagerModule,
} from '@rs-x/state-manager';

import { ExpressionChangeTransactionManager } from './expresion-change-transaction-manager';
import type { IExpressionChangeTransactionManager } from './expresion-change-transaction-manager.interface';
import { ExpressionCache } from './expression-cache/expression-cache';
import type { IExpressionCache } from './expression-cache/expression-cache.type';
import { ExpressionChangePlayback } from './expression-change-playback/expression-change-playback';
import { IExpressionChangePlayback } from './expression-change-playback/expression-change-playback.interface';
import { ExpressionChangeTrackerManager } from './expression-change-tracker/expression-change-tracker-manager';
import { IExpressionChangeTrackerManager } from './expression-change-tracker/expression-change-tracker-manager.interface';
import { ExpressionFactory } from './expression-factory/expression-factory';
import type { IExpressionFactory } from './expression-factory/expression-factory.interface';
import { ExpressionManager } from './expression-factory/expression-manager';
import type { IExpressionManager } from './expression-factory/expression-manager.type';
import { DeepCloneExceptWithExpressionSupport } from './expression-observer/deep-clone-except-with-expression-support';
import { ExpressionIndexAccessor } from './expression-observer/expression-index-accessor';
import { ExpressionMetadata } from './expression-observer/expression-metadata';
import { ExpressionObserverProxyPairFactory } from './expression-observer/expression-observer-proxy-pair.factory';
import { ExpressionObserverFactory } from './expression-observer/expression-observer.factory';
import type { IExpressionObserverFactory } from './expression-observer/expression-proxy.factory.type';
import { ExpressionServices } from './expression-services/expression-services';
import type { IExpressionServices } from './expression-services/expression-services.interface';
import type { IExpressionParser } from './expressions/expression-parser.interface';
import { ArrayIndexOwnerResolver } from './identifier-owner-resolver/array-index-owner-resolver';
import { DefaultIdentifierOwnerResolver } from './identifier-owner-resolver/default-identifier-owner-resolver';
import type { IIdentifierOwnerResolver } from './identifier-owner-resolver/identifier-owner-resolver.interface';
import { MapKeyOwnerResolver } from './identifier-owner-resolver/map-key-owner-resolver';
import { PropertyOwnerResolver } from './identifier-owner-resolver/property-owner-resolver';
import { JsEspreeExpressionParser } from './js-espree-expression-parser';
import { RsXExpressionParserInjectionTokens } from './rs-x-expression-parser-injection-tokes';

InjectionContainer.load(RsXStateManagerModule);

export const RsXExpressionParserModule = new ContainerModule((options) => {
  options.unbind(RsXCoreInjectionTokens.DefaultDeepCloneExcept);
  options
    .bind<IDeepCloneExcept>(RsXCoreInjectionTokens.DefaultDeepCloneExcept)
    .to(DeepCloneExceptWithExpressionSupport)
    .inSingletonScope();
  options
    .bind<IExpressionChangeTransactionManager>(
      RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager,
    )
    .to(ExpressionChangeTransactionManager)
    .inSingletonScope();
  options
    .bind<IExpressionParser>(
      RsXExpressionParserInjectionTokens.IExpressionParser,
    )
    .to(JsEspreeExpressionParser)
    .inSingletonScope();
  options
    .bind<IExpressionManager>(
      RsXExpressionParserInjectionTokens.IExpressionManager,
    )
    .to(ExpressionManager)
    .inSingletonScope();
  options
    .bind<IIdentifierOwnerResolver>(
      RsXExpressionParserInjectionTokens.IdentifierOwnerResolver,
    )
    .to(DefaultIdentifierOwnerResolver)
    .inSingletonScope();
  options
    .bind<IExpressionFactory>(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    )
    .to(ExpressionFactory)
    .inSingletonScope();
  options
    .bind<IExpressionObserverFactory>(
      RsXExpressionParserInjectionTokens.IExpressionObserverFactory,
    )
    .to(ExpressionObserverFactory)
    .inSingletonScope();
  options
    .bind<IExpressionCache>(RsXExpressionParserInjectionTokens.IExpressionCache)
    .to(ExpressionCache)
    .inSingletonScope();
  options
    .bind<IExpressionServices>(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    )
    .to(ExpressionServices)
    .inSingletonScope();
  options
    .bind<IExpressionChangePlayback>(
      RsXExpressionParserInjectionTokens.IExpressionChangePlayback,
    )
    .to(ExpressionChangePlayback)
    .inSingletonScope();

    options
    .bind<IExpressionChangeTrackerManager>(
      RsXExpressionParserInjectionTokens.IExpressionChangeTrackerManager,
    )
    .to(ExpressionChangeTrackerManager)
    .inSingletonScope();


  registerMultiInjectServices(
    options,
    RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList,
    [
      {
        target: PropertyOwnerResolver,
        token: RsXExpressionParserInjectionTokens.PropertyOwnerResolver,
      },
      {
        target: ArrayIndexOwnerResolver,
        token: RsXExpressionParserInjectionTokens.ArrayIndexOwnerResolver,
      },
      {
        target: MapKeyOwnerResolver,
        token: RsXExpressionParserInjectionTokens.MapKeyOwnerResolver,
      },
    ],
  );

  overrideMultiInjectServices(
    options,
    RsXCoreInjectionTokens.IIndexValueAccessorList,
    [
      {
        target: ExpressionIndexAccessor,
        token: RsXExpressionParserInjectionTokens.IExpressionIndexAccessor,
      },
      ...defaultIndexValueAccessorList,
    ],
  );

  overrideMultiInjectServices(
    options,
    RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList,
    [
      {
        target: ExpressionObserverProxyPairFactory,
        token:
          RsXExpressionParserInjectionTokens.IExpressionObserverProxyPairFactory,
      },
      ...defaultObjectObserverProxyPairFactoryList,
    ],
  );

  overrideMultiInjectServices(
    options,
    RsXCoreInjectionTokens.IValueMetadataList,
    [
      {
        target: ExpressionMetadata,
        token: RsXExpressionParserInjectionTokens.ExpressiomMetadata,
      },
      ...defaultValueMetadataList,
    ],
  );
});

export async function unloadRsXExpressionParserModule(): Promise<void> {
  await InjectionContainer.unload(RsXStateManagerModule);
  await InjectionContainer.unload(RsXExpressionParserModule);
}
