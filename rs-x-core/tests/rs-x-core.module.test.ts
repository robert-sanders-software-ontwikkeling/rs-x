import { ObjectStorage } from '../lib';
import { DeepCloneValueExcept } from '../lib/deep-clone/deep-clone-except';
import { DefaultDeepClone } from '../lib/deep-clone/default-deep-clone';
import { InjectionContainer } from '../lib/dependency-injection';
import { EqualityService } from '../lib/equality-service/equality-service';
import { ErrorLog } from '../lib/error-log/error-log';
import { FunctionCallIndexFactory } from '../lib/function-call-index/function-call-index.factory';
import { FunctionCallResultCacheFactory } from '../lib/function-call-result-cache/function-call-result-cache.factory';
import { GuidFactory } from '../lib/guid/guid.factory';
import { ArrayIndexAccessor } from '../lib/index-value-accessor/array-index-accessor';
import { DatePropertyAccessor } from '../lib/index-value-accessor/date-property-accessor';
import { IndexValueAccessor } from '../lib/index-value-accessor/index-value-accessor';
import { MapKeyAccessor } from '../lib/index-value-accessor/map-key-accessor';
import { MethodAccessor } from '../lib/index-value-accessor/method-accessor';
import { ObservableAccessor } from '../lib/index-value-accessor/observable-accessor';
import { PromiseAccessor } from '../lib/index-value-accessor/promise-accessor';
import { PropertyValueAccessor } from '../lib/index-value-accessor/property-value-accessor';
import { ResolvedValueCache } from '../lib/index-value-accessor/resolved-value-cache';
import { SetKeyAccessor } from '../lib/index-value-accessor/set-key-accessor';
import { RsXCoreInjectionTokens } from '../lib/rs-x-core.injection-tokens';
import { RsXCoreModule } from '../lib/rs-x-core.module';
import { SequenceIdFactory } from '../lib/sequence-id/sequence-id.factory';
import { ArrayMetadata } from '../lib/value-metadata/array-metadata';
import { DateMetadata } from '../lib/value-metadata/date-metadata';
import { DummyMetadata } from '../lib/value-metadata/dummy-metadata';
import { MapMetadata } from '../lib/value-metadata/map-metadata';
import { ObservableMetadata } from '../lib/value-metadata/observable-metadata';
import { PromiseMetadata } from '../lib/value-metadata/promise-metadata';
import { SetMetadata } from '../lib/value-metadata/set-metadata';
import { ValueMetadata } from '../lib/value-metadata/value-metadata';

describe('rs-x core module', () => {
  beforeAll(async () => {
    await InjectionContainer.load(RsXCoreModule);
  });

  afterAll(async () => {
    await InjectionContainer.unload(RsXCoreModule);
  });

  it('can get a injection container instance', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IInjectionContainer,
    );
    expect(actual).toBe(InjectionContainer);
  });

  it('injection container is a singelton', () => {
    const a1 = InjectionContainer.get(
      RsXCoreInjectionTokens.IInjectionContainer,
    );
    const a2 = InjectionContainer.get(
      RsXCoreInjectionTokens.IInjectionContainer,
    );
    expect(a1).toBe(a2);
  });

  it('Can get instance of IErrorLog', () => {
    const actual = InjectionContainer.get(RsXCoreInjectionTokens.IErrorLog);
    expect(actual).toBeInstanceOf(ErrorLog);
  });

  it('IErrorLog is a singleton', () => {
    const a1 = InjectionContainer.get(RsXCoreInjectionTokens.IErrorLog);
    const a2 = InjectionContainer.get(RsXCoreInjectionTokens.IErrorLog);
    expect(a1).toBe(a2);
  });

  it('can get instance of IPropertyValueAccessor', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IPropertyValueAccessor,
    );
    expect(actual).toBeInstanceOf(PropertyValueAccessor);
  });

  it('IPropertyValueAccessor instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXCoreInjectionTokens.IPropertyValueAccessor,
    );
    const a2 = InjectionContainer.get(
      RsXCoreInjectionTokens.IPropertyValueAccessor,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IMethodAccessor', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IMethodAccessor,
    );
    expect(actual).toBeInstanceOf(MethodAccessor);
  });

  it('IMethodAccessor instance is a singleton', () => {
    const a1 = InjectionContainer.get(RsXCoreInjectionTokens.IMethodAccessor);
    const a2 = InjectionContainer.get(RsXCoreInjectionTokens.IMethodAccessor);
    expect(a1).toBe(a2);
  });

  it('can get instance of IArrayIndexAccessor', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IArrayIndexAccessor,
    );
    expect(actual).toBeInstanceOf(ArrayIndexAccessor);
  });

  it('IArrayIndexAccessor instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXCoreInjectionTokens.IArrayIndexAccessor,
    );
    const a2 = InjectionContainer.get(
      RsXCoreInjectionTokens.IArrayIndexAccessor,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IMapKeyAccessor', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IMapKeyAccessor,
    );
    expect(actual).toBeInstanceOf(MapKeyAccessor);
  });

  it('IMapKeyAccessor instance is a singleton', () => {
    const a1 = InjectionContainer.get(RsXCoreInjectionTokens.IMapKeyAccessor);
    const a2 = InjectionContainer.get(RsXCoreInjectionTokens.IMapKeyAccessor);
    expect(a1).toBe(a2);
  });

  it('can get instance of ISetKeyAccessor', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.ISetKeyAccessor,
    );
    expect(actual).toBeInstanceOf(SetKeyAccessor);
  });

  it('ISetKeyAccessor instance is a singleton', () => {
    const a1 = InjectionContainer.get(RsXCoreInjectionTokens.ISetKeyAccessor);
    const a2 = InjectionContainer.get(RsXCoreInjectionTokens.ISetKeyAccessor);
    expect(a1).toBe(a2);
  });

  it('can get instance of IIndexValueAccessor', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IIndexValueAccessor,
    );
    expect(actual).toBeInstanceOf(IndexValueAccessor);
  });

  it('IIndexValueAccessor instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXCoreInjectionTokens.IIndexValueAccessor,
    );
    const a2 = InjectionContainer.get(
      RsXCoreInjectionTokens.IIndexValueAccessor,
    );
    expect(a1).toBe(a2);
  });

  it('can get an instance of IIndexValueAccessorList', () => {
    const actual = InjectionContainer.getAll(
      RsXCoreInjectionTokens.IIndexValueAccessorList,
    );

    expect(actual.length).toEqual(8);

    expect(actual[0]).toBeInstanceOf(PropertyValueAccessor);
    expect(actual[1]).toBeInstanceOf(MethodAccessor);
    expect(actual[2]).toBeInstanceOf(ArrayIndexAccessor);
    expect(actual[3]).toBeInstanceOf(MapKeyAccessor);
    expect(actual[4]).toBeInstanceOf(SetKeyAccessor);
    expect(actual[5]).toBeInstanceOf(ObservableAccessor);
    expect(actual[6]).toBeInstanceOf(PromiseAccessor);
    expect(actual[7]).toBeInstanceOf(DatePropertyAccessor);
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
  });

  it('can get an instance of IValueMetadataList', () => {
    const actual = InjectionContainer.getAll(
      RsXCoreInjectionTokens.IValueMetadataList,
    );

    expect(actual.length).toEqual(7);

    expect(actual[0]).toBeInstanceOf(ArrayMetadata);
    expect(actual[1]).toBeInstanceOf(DateMetadata);
    expect(actual[2]).toBeInstanceOf(DummyMetadata);
    expect(actual[3]).toBeInstanceOf(MapMetadata);
    expect(actual[4]).toBeInstanceOf(ObservableMetadata);
    expect(actual[5]).toBeInstanceOf(PromiseMetadata);
    expect(actual[6]).toBeInstanceOf(SetMetadata);
  });

  it('IValueMetadataList instance is a singelton', () => {
    const a1 = InjectionContainer.getAll(
      RsXCoreInjectionTokens.IValueMetadataList,
    );
    const a2 = InjectionContainer.getAll(
      RsXCoreInjectionTokens.IValueMetadataList,
    );
    expect(a1[0]).toBe(a2[0]);
    expect(a1[1]).toBe(a2[1]);
    expect(a1[2]).toBe(a2[2]);
    expect(a1[3]).toBe(a2[3]);
    expect(a1[4]).toBe(a2[4]);
    expect(a1[5]).toBe(a2[5]);
    expect(a1[6]).toBe(a2[6]);
  });

  it('can get instance of IValueMetadata', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IValueMetadata,
    );
    expect(actual).toBeInstanceOf(ValueMetadata);
  });

  it('IValueMetadata instance is a singleton', () => {
    const a1 = InjectionContainer.get(RsXCoreInjectionTokens.IValueMetadata);
    const a2 = InjectionContainer.get(RsXCoreInjectionTokens.IValueMetadata);
    expect(a1).toBe(a2);
  });

  it('can get instance of IDeepClone', () => {
    const actual = InjectionContainer.get(RsXCoreInjectionTokens.IDeepClone);
    expect(actual).toBeInstanceOf(DefaultDeepClone);
  });

  it('IDeepClone instance is a singleton', () => {
    const a1 = InjectionContainer.get(RsXCoreInjectionTokens.IDeepClone);
    const a2 = InjectionContainer.get(RsXCoreInjectionTokens.IDeepClone);
    expect(a1).toBe(a2);
  });

  it('can get instance of IEqualityService', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IEqualityService,
    );
    expect(actual).toBeInstanceOf(EqualityService);
  });

  it('IEqualityService instance is a singleton', () => {
    const a1 = InjectionContainer.get(RsXCoreInjectionTokens.IEqualityService);
    const a2 = InjectionContainer.get(RsXCoreInjectionTokens.IEqualityService);
    expect(a1).toBe(a2);
  });

  it('can get instance of IObservableAccessor', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IObservableAccessor,
    );
    expect(actual).toBeInstanceOf(ObservableAccessor);
  });

  it('IObservableAccessor instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXCoreInjectionTokens.IObservableAccessor,
    );
    const a2 = InjectionContainer.get(
      RsXCoreInjectionTokens.IObservableAccessor,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IPromiseAccessor', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IPromiseAccessor,
    );
    expect(actual).toBeInstanceOf(PromiseAccessor);
  });

  it('IPromiseAccessor instance is a singleton', () => {
    const a1 = InjectionContainer.get(RsXCoreInjectionTokens.IPromiseAccessor);
    const a2 = InjectionContainer.get(RsXCoreInjectionTokens.IPromiseAccessor);
    expect(a1).toBe(a2);
  });

  it('can get instance of ISequenceIdFactory', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.ISequenceIdFactory,
    );
    expect(actual).toBeInstanceOf(SequenceIdFactory);
  });

  it('ISequenceIdFactory instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXCoreInjectionTokens.ISequenceIdFactory,
    );
    const a2 = InjectionContainer.get(
      RsXCoreInjectionTokens.ISequenceIdFactory,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IFunctionCallIndexFactory', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IFunctionCallIndexFactory,
    );
    expect(actual).toBeInstanceOf(FunctionCallIndexFactory);
  });

  it('IFunctionCallIndexFactory instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXCoreInjectionTokens.IFunctionCallIndexFactory,
    );
    const a2 = InjectionContainer.get(
      RsXCoreInjectionTokens.IFunctionCallIndexFactory,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IFunctionCallResultCacheFactory', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IFunctionCallResultCacheFactory,
    );
    expect(actual).toBeInstanceOf(FunctionCallResultCacheFactory);
  });

  it('IFunctionCallResultCacheFactory instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXCoreInjectionTokens.IFunctionCallResultCacheFactory,
    );
    const a2 = InjectionContainer.get(
      RsXCoreInjectionTokens.IFunctionCallResultCacheFactory,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IGuidFactory', () => {
    const actual = InjectionContainer.get(RsXCoreInjectionTokens.IGuidFactory);
    expect(actual).toBeInstanceOf(GuidFactory);
  });

  it('IGuidFactory instance is a singleton', () => {
    const a1 = InjectionContainer.get(RsXCoreInjectionTokens.IGuidFactory);
    const a2 = InjectionContainer.get(RsXCoreInjectionTokens.IGuidFactory);
    expect(a1).toBe(a2);
  });

  it('can get instance of IResolvedValueCache', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IResolvedValueCache,
    );
    expect(actual).toBeInstanceOf(ResolvedValueCache);
  });

  it('IResolvedValueCache instance is a singleton', () => {
    const a1 = InjectionContainer.get(
      RsXCoreInjectionTokens.IResolvedValueCache,
    );
    const a2 = InjectionContainer.get(
      RsXCoreInjectionTokens.IResolvedValueCache,
    );
    expect(a1).toBe(a2);
  });

  it('can get instance of IDeepCloneValueGetter', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IDeepCloneExcept,
    );
    expect(actual).toBeInstanceOf(DeepCloneValueExcept);
  });

  it('IDeepCloneValueGetter instance is a singleton', () => {
    const a1 = InjectionContainer.get(RsXCoreInjectionTokens.IDeepCloneExcept);
    const a2 = InjectionContainer.get(RsXCoreInjectionTokens.IDeepCloneExcept);
    expect(a1).toBe(a2);
  });

  it('can get instance of IDBFactory', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IDBFactory,
    );
    expect(actual).toBe(window.indexedDB);
  });

  it('IDBFactory instance is a singleton', () => {
    const a1 = InjectionContainer.get(RsXCoreInjectionTokens.IDBFactory);
    const a2 = InjectionContainer.get(RsXCoreInjectionTokens.IDBFactory);
    expect(a1).toBe(a2);
  });


  it('can get instance of IObjectStorage', () => {
    const actual = InjectionContainer.get(
      RsXCoreInjectionTokens.IObjectStorage,
    );
    expect(actual).toBeInstanceOf(ObjectStorage);
  });

  it('IObjectStorage instance is a singleton', () => {
    const a1 = InjectionContainer.get(RsXCoreInjectionTokens.IObjectStorage);
    const a2 = InjectionContainer.get(RsXCoreInjectionTokens.IObjectStorage);
    expect(a1).toBe(a2);
  });
});
