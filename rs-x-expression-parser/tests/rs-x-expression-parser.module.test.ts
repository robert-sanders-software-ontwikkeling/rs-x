import {
  ArrayIndexAccessor,
  DatePropertyAccessor,
  InjectionContainer,
  MapKeyAccessor,
  MethodAccessor,
  ObservableAccessor,
  PromiseAccessor,
  PropertyValueAccessor,
  RsXCoreInjectionTokens,
  SetKeyAccessor,
} from '@rs-x/core';
import {
  ArrayObserverProxyPairFactory,
  DateObserverProxyPairFactory,
  MapObserverProxyPairFactory,
  ObservableObserverProxyPairFactory,
  PlainObjectObserverProxyPairFactory,
  PromiseObserverProxyPairFactory,
  RsXStateManagerInjectionTokens,
  SetObserverProxyPairFactory,
} from '@rs-x/state-manager';

import { ExpressionChangeTransactionManager } from '../lib/expresion-change-transaction-manager';
import { ExpressionCache } from '../lib/expression-cache/expression-cache';
import { ExpressionFactory } from '../lib/expression-factory/expression-factory';
import { ExpressionManager } from '../lib/expression-factory/expression-manager';
import { DeepCloneExceptWithExpressionSupport } from '../lib/expression-observer/deep-clone-except-with-expression-support';
import { ExpressionIndexAccessor } from '../lib/expression-observer/expression-index-accessor';
import { ExpressionObserverFactory } from '../lib/expression-observer/expression-observer.factory';
import { ExpressionObserverProxyPairFactory } from '../lib/expression-observer/expression-observer-proxy-pair.factory';
import { ExpressionServices } from '../lib/expression-services/expression-services';
import { ArrayIndexOwnerResolver } from '../lib/identifier-owner-resolver/array-index-owner-resolver';
import { DefaultIdentifierOwnerResolver } from '../lib/identifier-owner-resolver/default-identifier-owner-resolver';
import { MapKeyOwnerResolver } from '../lib/identifier-owner-resolver/map-key-owner-resolver';
import { PropertyOwnerResolver } from '../lib/identifier-owner-resolver/property-owner-resolver';
import { JsEspreeExpressionParser } from '../lib/js-espree-expression-parser';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../lib/rs-x-expression-parser-injection-tokes';
import { ExpressionChangePlayback } from '../lib/expression-change-playback/expression-change-playback';

describe('RsXExpressionParserModule tests', () => {
  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule;
  });

  it('can get instance of IExpressionManager', () => {
    const actual = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionManager,
    );
    expect(actual).toBeInstanceOf(ExpressionManager);
  });

  it('IExpressionManager instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionManager,
    );
    const a2 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionManager,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IExpressionFactory', () => {
    const actual = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    );
    expect(actual).toBeInstanceOf(ExpressionFactory);
  });

  it('IExpressionFactory instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    );
    const a2 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IExpressionChangeTransactionManager', () => {
    const actual = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager,
    );
    expect(actual).toBeInstanceOf(ExpressionChangeTransactionManager);
  });

  it('IExpressionChangeTransactionManager instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager,
    );
    const a2 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IExpressionParser', () => {
    const actual = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionParser,
    );
    expect(actual).toBeInstanceOf(JsEspreeExpressionParser);
  });

  it('IExpressionParser instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionParser,
    );
    const a2 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionParser,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of PropertyOwnerResolver', () => {
    const actual = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.PropertyOwnerResolver,
    );
    expect(actual).toBeInstanceOf(PropertyOwnerResolver);
  });

  it('PropertyOwnerResolver instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.PropertyOwnerResolver,
    );
    const a2 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.PropertyOwnerResolver,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of ArrayIndexOwnerResolver', () => {
    const actual = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.ArrayIndexOwnerResolver,
    );
    expect(actual).toBeInstanceOf(ArrayIndexOwnerResolver);
  });

  it('ArrayIndexOwnerResolver instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.ArrayIndexOwnerResolver,
    );
    const a2 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.ArrayIndexOwnerResolver,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of MapKeyOwnerResolver', () => {
    const actual = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.MapKeyOwnerResolver,
    );
    expect(actual).toBeInstanceOf(MapKeyOwnerResolver);
  });

  it('MapKeyOwnerResolver instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.MapKeyOwnerResolver,
    );
    const a2 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.MapKeyOwnerResolver,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IdentifierOwnerResolver', () => {
    const actual = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IdentifierOwnerResolver,
    );
    expect(actual).toBeInstanceOf(DefaultIdentifierOwnerResolver);
  });

  it('IdentifierOwnerResolver instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IdentifierOwnerResolver,
    );
    const a2 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IdentifierOwnerResolver,
    );
    expect(a1).toBe(a2);
  });

  it('can get an instance of IIdentifierOwnerResolverList', () => {
    const actual = InjectionContainer.getAll(
      RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList,
    );

    expect(actual.length).toEqual(3);

    expect(actual[0]).toBeInstanceOf(PropertyOwnerResolver);
    expect(actual[1]).toBeInstanceOf(ArrayIndexOwnerResolver);
    expect(actual[2]).toBeInstanceOf(MapKeyOwnerResolver);
  });

  it('IIdentifierOwnerResolverList instance is a singelton', () => {
    const a1 = InjectionContainer.getAll(
      RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList,
    );
    const a2 = InjectionContainer.getAll(
      RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList,
    );
    expect(a1[0]).toBe(a2[0]);
    expect(a1[1]).toBe(a2[1]);
    expect(a1[2]).toBe(a2[2]);
  });

  it('can get an instance of IIndexValueAccessorList', () => {
    const actual = InjectionContainer.getAll(
      RsXCoreInjectionTokens.IIndexValueAccessorList,
    );

    expect(actual.length).toEqual(9);
    expect(actual[0]).toBeInstanceOf(ExpressionIndexAccessor);
    expect(actual[1]).toBeInstanceOf(PropertyValueAccessor);
    expect(actual[2]).toBeInstanceOf(MethodAccessor);
    expect(actual[3]).toBeInstanceOf(ArrayIndexAccessor);
    expect(actual[4]).toBeInstanceOf(MapKeyAccessor);
    expect(actual[5]).toBeInstanceOf(SetKeyAccessor);
    expect(actual[6]).toBeInstanceOf(ObservableAccessor);
    expect(actual[7]).toBeInstanceOf(PromiseAccessor);
    expect(actual[8]).toBeInstanceOf(DatePropertyAccessor);
  });

  it('IIndexValueAccessorList instance is a singelton', () => {
    const a1 = InjectionContainer.getAll(
      RsXCoreInjectionTokens.IIndexValueAccessorList,
    );
    const a2 = InjectionContainer.getAll(
      RsXCoreInjectionTokens.IIndexValueAccessorList,
    );
    expect(a1[0]).toBe(a2[0]);
    expect(a1[1]).toBe(a2[1]);
    expect(a1[2]).toBe(a2[2]);
    expect(a1[3]).toBe(a2[3]);
    expect(a1[4]).toBe(a2[4]);
    expect(a1[5]).toBe(a2[5]);
    expect(a1[6]).toBe(a2[6]);
    expect(a1[7]).toBe(a2[7]);
    expect(a1[8]).toBe(a2[8]);
  });

  it('can get instance of IExpressionObserverFactory', () => {
    const actual = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionObserverFactory,
    );
    expect(actual).toBeInstanceOf(ExpressionObserverFactory);
  });

  it('IExpressionObserverFactory instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionObserverFactory,
    );
    const a2 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionObserverFactory,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IDeepCloneValueGetter', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.DefaultDeepCloneExcept,
    );
    expect(actual).toBeInstanceOf(DeepCloneExceptWithExpressionSupport);
  });

  it('DefaultDeepCloneExcept instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXCoreInjectionTokens.DefaultDeepCloneExcept,
    );
    const a2 = InjectionContainer.get(
      RsXCoreInjectionTokens.DefaultDeepCloneExcept,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IExpressionCache', () => {
    const actual = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionCache,
    );
    expect(actual).toBeInstanceOf(ExpressionCache);
  });

  it('IExpressionCache instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionCache,
    );
    const a2 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionCache,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IExpressionServices', () => {
    const actual = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    expect(actual).toBeInstanceOf(ExpressionServices);
  });

  it('IExpressionServices instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const a2 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    expect(a1).toBe(a2);
  });


  it('can get instance of IExpressionChangePlayback', () => {
    const actual = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionChangePlayback,
    );
    expect(actual).toBeInstanceOf(ExpressionChangePlayback);
  });

  it('IExpressionChangePlayback instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionChangePlayback,
    );
    const a2 = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionChangePlayback,
    );
    expect(a1).toBe(a2);
  });


  it('can get an instance of IObjectObserverProxyPairFactoryList', () => {
    const actual = InjectionContainer.getAll(
      RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList,
    );

    expect(actual.length).toEqual(8);
    expect(actual[0]).toBeInstanceOf(ExpressionObserverProxyPairFactory);
    expect(actual[1]).toBeInstanceOf(PlainObjectObserverProxyPairFactory);
    expect(actual[2]).toBeInstanceOf(DateObserverProxyPairFactory);
    expect(actual[3]).toBeInstanceOf(ArrayObserverProxyPairFactory);
    expect(actual[4]).toBeInstanceOf(PromiseObserverProxyPairFactory);
    expect(actual[5]).toBeInstanceOf(ObservableObserverProxyPairFactory);
    expect(actual[6]).toBeInstanceOf(MapObserverProxyPairFactory);
    expect(actual[7]).toBeInstanceOf(SetObserverProxyPairFactory);
  });

  it('IObjectObserverProxyPairFactoryList instance is a singelton', () => {
    const a1 = InjectionContainer.getAll(
      RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList,
    );
    const a2 = InjectionContainer.getAll(
      RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList,
    );
    expect(a1[0]).toBe(a2[0]);
    expect(a1[1]).toBe(a2[1]);
    expect(a1[2]).toBe(a2[2]);
    expect(a1[3]).toBe(a2[3]);
    expect(a1[4]).toBe(a2[4]);
    expect(a1[5]).toBe(a2[5]);
    expect(a1[6]).toBe(a2[6]);
    expect(a1[7]).toBe(a2[7]);
  });
});
