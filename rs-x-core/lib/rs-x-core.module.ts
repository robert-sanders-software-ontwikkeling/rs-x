import { type IDeepClone } from './deep-clone/deep-clone.interface';
import { DeepCloneValueExcept } from './deep-clone/deep-clone-except';
import { type IDeepCloneExcept } from './deep-clone/deep-clone-except.interface';
import { DefaultDeepClone } from './deep-clone/default-deep-clone';
import { FastDeepClone } from './deep-clone/fast-deep-clone';
import { LodashDeepClone } from './deep-clone/lodash-deep-clone';
import { StructuredDeepClone } from './deep-clone/structured-deep-clone';
import { EqualityService } from './equality-service/equality-service';
import { type IEqualityService } from './equality-service/equality-service.interface';
import { ErrorLog } from './error-log/error-log';
import { type IErrorLog } from './error-log/error-log.interface';
import { FunctionCallIndexFactory } from './function-call-index/function-call-index.factory';
import { type IFunctionCallIndexFactory } from './function-call-index/function-call-index.factory.type';
import { FunctionCallResultCache } from './function-call-result-cache/function-call-result-cache';
import { type IFunctionCallResultCache } from './function-call-result-cache/function-call-result-cache.interface';
import { GuidFactory } from './guid/guid.factory';
import { type IGuidFactory } from './guid/guid.factory.interface';
import { ArrayIndexAccessor } from './index-value-accessor/array-index-accessor';
import { DatePropertyAccessor } from './index-value-accessor/date-property-accessor';
import { GlobalIndexAccessor } from './index-value-accessor/global-index-accesor';
import { IndexValueAccessor } from './index-value-accessor/index-value-accessor';
import { type IIndexValueAccessor } from './index-value-accessor/index-value-accessor.interface';
import { MapKeyAccessor } from './index-value-accessor/map-key-accessor';
import { MethodAccessor } from './index-value-accessor/method-accessor';
import { ObservableAccessor } from './index-value-accessor/observable-accessor';
import { PromiseAccessor } from './index-value-accessor/promise-accessor';
import { PropertyValueAccessor } from './index-value-accessor/property-value-accessor';
import { ResolvedValueCache } from './index-value-accessor/resolved-value-cache';
import { type IResolvedValueCache } from './index-value-accessor/resolved-value-cache.interface';
import { SetKeyAccessor } from './index-value-accessor/set-key-accessor';
import { ObjectStorage } from './object-store/object-storage';
import { type IObjectStorage } from './object-store/object-storage.interface';
import { ProxyRegistry } from './proxy-registry/proxy-registry';
import type { IProxyRegistry } from './proxy-registry/proxy-registry.interface';
import { SequenceIdFactory } from './sequence-id/sequence-id.factory';
import { type ISequenceIdFactory } from './sequence-id/sequence-id-factory.interface';
import { ArrayMetadata } from './value-metadata/array-metadata';
import { DateMetadata } from './value-metadata/date-metadata';
import { DummyMetadata } from './value-metadata/dummy-metadata';
import { MapMetadata } from './value-metadata/map-metadata';
import { ObservableMetadata } from './value-metadata/observable-metadata';
import { PromiseMetadata } from './value-metadata/promise-metadata';
import { SetMetadata } from './value-metadata/set-metadata';
import { ValueMetadata } from './value-metadata/value-metadata';
import type { IValueMetadata } from './value-metadata/value-metadata.interface';
import {
  type Container,
  ContainerModule,
  type IMultiInjectService,
  InjectionContainer,
  registerMultiInjectServices,
} from './dependency-injection';
import { RsXCoreInjectionTokens } from './rs-x-core.injection-tokens';

export const defaultIndexValueAccessorList: readonly IMultiInjectService[] = [
  {
    target: PropertyValueAccessor,
    token: RsXCoreInjectionTokens.IPropertyValueAccessor,
  },
  { target: MethodAccessor, token: RsXCoreInjectionTokens.IMethodAccessor },
  {
    target: ArrayIndexAccessor,
    token: RsXCoreInjectionTokens.IArrayIndexAccessor,
  },
  { target: MapKeyAccessor, token: RsXCoreInjectionTokens.IMapKeyAccessor },
  { target: SetKeyAccessor, token: RsXCoreInjectionTokens.ISetKeyAccessor },
  {
    target: ObservableAccessor,
    token: RsXCoreInjectionTokens.IObservableAccessor,
  },
  { target: PromiseAccessor, token: RsXCoreInjectionTokens.IPromiseAccessor },
  {
    target: DatePropertyAccessor,
    token: RsXCoreInjectionTokens.IDatePropertyAccessor,
  },
  {
    target: GlobalIndexAccessor,
    token: RsXCoreInjectionTokens.IGlobalIndexAccessor,
  },
];

export const defaultDeepCloneList: readonly IMultiInjectService[] = [
  {
    target: FastDeepClone,
    token: RsXCoreInjectionTokens.IFastDeepClone,
  },
  {
    target: StructuredDeepClone,
    token: RsXCoreInjectionTokens.IStructuredDeepClone,
  },
  { target: LodashDeepClone, token: RsXCoreInjectionTokens.ILodashDeepClone },
];

export const defaultValueMetadataList: readonly IMultiInjectService[] = [
  { target: ArrayMetadata, token: RsXCoreInjectionTokens.ArrayMetadata },
  { target: DateMetadata, token: RsXCoreInjectionTokens.DateMetadata },
  { target: DummyMetadata, token: RsXCoreInjectionTokens.DummyMetadata },
  { target: MapMetadata, token: RsXCoreInjectionTokens.MapMetadata },
  {
    target: ObservableMetadata,
    token: RsXCoreInjectionTokens.ObservableMetadata,
  },
  { target: PromiseMetadata, token: RsXCoreInjectionTokens.PromiseMetadata },
  { target: SetMetadata, token: RsXCoreInjectionTokens.SetMetadata },
];

export const RsXCoreModule = new ContainerModule((options) => {
  options
    .bind<Container>(RsXCoreInjectionTokens.IInjectionContainer)
    .toConstantValue(InjectionContainer);
  options
    .bind<IErrorLog>(RsXCoreInjectionTokens.IErrorLog)
    .to(ErrorLog)
    .inSingletonScope();
  options
    .bind<IIndexValueAccessor>(RsXCoreInjectionTokens.IIndexValueAccessor)
    .to(IndexValueAccessor)
    .inSingletonScope();
  options
    .bind<IDeepClone>(RsXCoreInjectionTokens.IDeepClone)
    .to(DefaultDeepClone)
    .inSingletonScope();
  options
    .bind<IEqualityService>(RsXCoreInjectionTokens.IEqualityService)
    .to(EqualityService)
    .inSingletonScope();
  options
    .bind<ISequenceIdFactory>(RsXCoreInjectionTokens.ISequenceIdFactory)
    .to(SequenceIdFactory)
    .inSingletonScope();
  options
    .bind<IFunctionCallIndexFactory>(
      RsXCoreInjectionTokens.IFunctionCallIndexFactory,
    )
    .to(FunctionCallIndexFactory)
    .inSingletonScope();
  options
    .bind<IFunctionCallResultCache>(
      RsXCoreInjectionTokens.IFunctionCallResultCache,
    )
    .to(FunctionCallResultCache)
    .inSingletonScope();
  options
    .bind<IGuidFactory>(RsXCoreInjectionTokens.IGuidFactory)
    .to(GuidFactory)
    .inSingletonScope();
  options
    .bind<IResolvedValueCache>(RsXCoreInjectionTokens.IResolvedValueCache)
    .to(ResolvedValueCache)
    .inSingletonScope();
  options
    .bind<IDeepCloneExcept>(RsXCoreInjectionTokens.IDeepCloneExcept)
    .to(DeepCloneValueExcept)
    .inSingletonScope();
  options
    .bind<IDeepCloneExcept>(RsXCoreInjectionTokens.DefaultDeepCloneExcept)
    .to(DeepCloneValueExcept)
    .inSingletonScope();
  options
    .bind<IValueMetadata>(RsXCoreInjectionTokens.IValueMetadata)
    .to(ValueMetadata)
    .inSingletonScope();
  options
    .bind<IDBFactory>(RsXCoreInjectionTokens.IDBFactory)
    .toDynamicValue(() => {
      if (typeof window === 'undefined') {
        throw new Error('IDBFactory is not available for SSR');
      }
      return window.indexedDB;
    });

  options
    .bind<IObjectStorage>(RsXCoreInjectionTokens.IObjectStorage)
    .to(ObjectStorage)
    .inSingletonScope();
  options
    .bind<IProxyRegistry>(RsXCoreInjectionTokens.IProxyRegistry)
    .to(ProxyRegistry)
    .inSingletonScope();

  registerMultiInjectServices(
    options,
    RsXCoreInjectionTokens.IIndexValueAccessorList,
    defaultIndexValueAccessorList,
  );
  registerMultiInjectServices(
    options,
    RsXCoreInjectionTokens.IDeepCloneList,
    defaultDeepCloneList,
  );
  registerMultiInjectServices(
    options,
    RsXCoreInjectionTokens.IValueMetadataList,
    defaultValueMetadataList,
  );
});
