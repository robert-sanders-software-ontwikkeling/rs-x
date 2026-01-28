import { DeepCloneValueExcept } from './deep-clone/deep-clone-except';
import { type IDeepCloneExcept } from './deep-clone/deep-clone-except.interface';
import { type IDeepClone } from './deep-clone/deep-clone.interface';
import { DefaultDeepClone } from './deep-clone/default-deep-clone';
import { LodashDeepClone } from './deep-clone/lodash-deep-clone';
import { StructuredDeepClone } from './deep-clone/structured-deep-clone';
import {
   type Container,
   ContainerModule,
   type IMultiInjectService,
   InjectionContainer,
   registerMultiInjectServices
} from './dependency-injection';
import { EqualityService } from './equality-service/equality-service';
import { type IEqualityService } from './equality-service/equality-service.interface';
import { ErrorLog } from './error-log/error-log';
import { type IErrorLog } from './error-log/error-log.interface';
import { FunctionCallIndexFactory } from './function-call-index/function-call-index.factory';
import { type IFunctionCallIndexFactory } from './function-call-index/function-call-index.factory.type';
import { FunctionCallResultCacheFactory } from './function-call-result-cache/function-call-result-cache.factory';
import { type IFunctionCallResultCacheFactory } from './function-call-result-cache/function-call-result-cache.factory.interface';
import { GuidFactory } from './guid/guid.factory';
import { type IGuidFactory } from './guid/guid.factory.interface';
import { ArrayIndexAccessor } from './index-value-accessor/array-index-accessor';
import { DatePropertyAccessor } from './index-value-accessor/date-property-accessor';
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
import { RsXCoreInjectionTokens } from './rs-x-core.injection-tokens';
import { type ISequenceIdFactory } from './sequence-id/sequence-id-factory.interface';
import { SequenceIdFactory } from './sequence-id/sequence-id.factory';

export const defaultIndexValueAccessorList: readonly IMultiInjectService[] = [
   { target: PropertyValueAccessor, token: RsXCoreInjectionTokens.IPropertyValueAccessor },
   { target: MethodAccessor, token: RsXCoreInjectionTokens.IMethodAccessor },
   { target: ArrayIndexAccessor, token: RsXCoreInjectionTokens.IArrayIndexAccessor },
   { target: MapKeyAccessor, token: RsXCoreInjectionTokens.IMapKeyAccessor },
   { target: SetKeyAccessor, token: RsXCoreInjectionTokens.ISetKeyAccessor },
   { target: ObservableAccessor, token: RsXCoreInjectionTokens.IObservableAccessor },
   { target: PromiseAccessor, token: RsXCoreInjectionTokens.IPromiseAccessor },
   { target: DatePropertyAccessor, token: RsXCoreInjectionTokens.IDatePropertyAccessor }
];

export const defaultDeeoCloneList: readonly IMultiInjectService[] = [
   { target: StructuredDeepClone, token: RsXCoreInjectionTokens.IStructuredDeepClone },
   { target: LodashDeepClone, token: RsXCoreInjectionTokens.ILodashDeepClone },
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
      .bind<IFunctionCallIndexFactory>(RsXCoreInjectionTokens.IFunctionCallIndexFactory)
      .to(FunctionCallIndexFactory)
      .inSingletonScope();
   options
      .bind<IFunctionCallResultCacheFactory>(RsXCoreInjectionTokens.IFunctionCallResultCacheFactory)
      .to(FunctionCallResultCacheFactory)
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

      
   registerMultiInjectServices(
      options,
      RsXCoreInjectionTokens.IIndexValueAccessorList,
      defaultIndexValueAccessorList
   );
   registerMultiInjectServices(
      options,
      RsXCoreInjectionTokens.IDeepCloneList,
      defaultDeeoCloneList
   );
});
