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

import { ExpressionCache } from './expression-cache/expression-cache';
import type { IExpressionCache } from './expression-cache/expression-cache.type';
import { CompiledExpressionCompiler } from './compiled-expression/compiled-expression.compiler';
import type { ICompiledExpressionCompiler } from './compiled-expression/compiled-expression.compiler.interface';
import { CompiledExpressionEngine } from './expression-engine/compiled-expression-engine';
import { type ICompiledExpressionEngine, type IExpressionEngineSelector, type ITreeExpressionEngine } from './expression-engine/expression-engine.interface';
import { ExpressionEngineSelector } from './expression-engine/expression-engine-selector';
import { TreeExpressionEngine } from './expression-engine/tree-expression-engine';
import { ExpressionChangePlayback } from './expression-change-playback/expression-change-playback';
import { type IExpressionChangePlayback } from './expression-change-playback/expression-change-playback.interface';
import { ExpressionChangeTrackerManager } from './expression-change-tracker/expression-change-tracker-manager';
import { type IExpressionChangeTrackerManager } from './expression-change-tracker/expression-change-tracker-manager.interface';
import { ExpressionFactory } from './expression-factory/expression-factory';
import type { IExpressionFactory } from './expression-factory/expression-factory.interface';
import { ExpressionManager } from './expression-factory/expression-manager';
import type { IExpressionManager } from './expression-factory/expression-manager.type';
import { ExpressionIdProvider } from './expression-id/expression-id-provider';
import { type IExpressionIdProvider } from './expression-id/expression-id-provider.interface';
import { DeepCloneExceptWithExpressionSupport } from './expression-observer/deep-clone-except-with-expression-support';
import { ExpressionIndexAccessor } from './expression-observer/expression-index-accessor';
import { ExpressionMetadata } from './expression-observer/expression-metadata';
import { ExpressionObserverFactory } from './expression-observer/expression-observer.factory';
import { ExpressionObserverProxyPairFactory } from './expression-observer/expression-observer-proxy-pair.factory';
import type { IExpressionObserverFactory } from './expression-observer/expression-proxy.factory.type';
import { ExpressionServices } from './expression-services/expression-services';
import type { IExpressionServices } from './expression-services/expression-services.interface';
import type { IExpressionParser } from './expressions/expression-parser.interface';
import { IdentifierWatchRuleFactory } from './expressions/identifier-index-watch-rule/identifier-watch-rule.factory';
import type { IIdentifierWatchRuleFactory } from './expressions/identifier-index-watch-rule/identifier-watch-rule.factory.interface';
import { ArrayIndexOwnerResolver } from './identifier-owner-resolver/array-index-owner-resolver';
import { DefaultIdentifierOwnerResolver } from './identifier-owner-resolver/default-identifier-owner-resolver';
import { GlobalIdentifierOwnerResolver } from './identifier-owner-resolver/global-identifier-owner-resolver';
import type { IIdentifierOwnerResolver } from './identifier-owner-resolver/identifier-owner-resolver.interface';
import { MapKeyOwnerResolver } from './identifier-owner-resolver/map-key-owner-resolver';
import { PropertyOwnerResolver } from './identifier-owner-resolver/property-owner-resolver';
import { SetKeyOwnerResolver } from './identifier-owner-resolver/set-key-owner-resolver';
import { ExpressionChangeTransactionManager } from './expresion-change-transaction-manager';
import type { IExpressionChangeTransactionManager } from './expresion-change-transaction-manager.interface';
import {
  ExpressionEvaluateManager,
  type IExpressionEvaluateManager,
} from './expression-evaluate-manager';
import { JsExpressionParser } from './js-expression-parser';
import {
  JsExpressionAstParser,
  type IJsExpressionAstParser,
} from './js-expression-ast-parser';
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
    .to(JsExpressionParser)
    .inSingletonScope();
  options
    .bind<IJsExpressionAstParser>(
      RsXExpressionParserInjectionTokens.IJsExpressionAstParser,
    )
    .to(JsExpressionAstParser)
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
    .bind<ICompiledExpressionCompiler>(
      RsXExpressionParserInjectionTokens.ICompiledExpressionCompiler,
    )
    .to(CompiledExpressionCompiler)
    .inSingletonScope();
  options
    .bind<ITreeExpressionEngine>(
      RsXExpressionParserInjectionTokens.ITreeExpressionEngine,
    )
    .to(TreeExpressionEngine)
    .inSingletonScope();
  options
    .bind<ICompiledExpressionEngine>(
      RsXExpressionParserInjectionTokens.ICompiledExpressionEngine,
    )
    .to(CompiledExpressionEngine)
    .inSingletonScope();
  options
    .bind<IExpressionEngineSelector>(
      RsXExpressionParserInjectionTokens.IExpressionEngineSelector,
    )
    .to(ExpressionEngineSelector)
    .inSingletonScope();
  options
    .bind<IExpressionServices>(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    )
    .to(ExpressionServices)
    .inSingletonScope();
  options
    .bind<IExpressionEvaluateManager>(
      RsXExpressionParserInjectionTokens.IExpressionEvaluateManager,
    )
    .to(ExpressionEvaluateManager)
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

  options
    .bind<IExpressionIdProvider>(
      RsXExpressionParserInjectionTokens.IExpressionIdProvider,
    )
    .to(ExpressionIdProvider)
    .inSingletonScope();

  options
    .bind<IIdentifierWatchRuleFactory>(
      RsXExpressionParserInjectionTokens.IIdentifierWatchRuleFactory,
    )
    .to(IdentifierWatchRuleFactory)
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
        target: SetKeyOwnerResolver,
        token: RsXExpressionParserInjectionTokens.SetKeyOwnerResolver,
      },
      {
        target: MapKeyOwnerResolver,
        token: RsXExpressionParserInjectionTokens.MapKeyOwnerResolver,
      },
      {
        target: GlobalIdentifierOwnerResolver,
        token: RsXExpressionParserInjectionTokens.GlobalIdentifierOwnerResolver,
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
