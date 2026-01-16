import { DeepClone } from './deep-clone/deep-clone';
import { IDeepClone } from './deep-clone/deep-clone.interface';
import {
   Container,
   ContainerModule,
   InjectionContainer,
   registerMultiInjectServices
} from './dependency-injection';
import { EqualityService } from './equality-service/equality-service';
import { IEqualityService } from './equality-service/equality-service.interface';
import { ErrorLog } from './error-log/error-log';
import { IErrorLog } from './error-log/error-log.interface';
import { FunctionCallIndexFactory } from './function-call-index/function-call-index.factory';
import { IFunctionCallIndexFactory } from './function-call-index/function-call-index.factory.type';
import { FunctionCallResultCacheFactory } from './function-call-result-cache/function-call-result-cache.factory';
import { IFunctionCallResultCacheFactory } from './function-call-result-cache/function-call-result-cache.factory.interface';
import { GuidFactory } from './guid/guid.factory';
import { IGuidFactory } from './guid/guid.factory.interface';
import { ArrayIndexAccessor } from './index-value-accessor/array-index-accessor';
import { DatePropertyAccessor } from './index-value-accessor/date-property-accessor';
import { IndexValueAccessor } from './index-value-accessor/index-value-accessor';
import { IIndexValueAccessor } from './index-value-accessor/index-value-accessor.interface';
import { MapKeyAccessor } from './index-value-accessor/map-key-accessor';
import { MethodAccessor } from './index-value-accessor/method-accessor';
import { ObservableAccessor } from './index-value-accessor/observable-accessor';
import { PromiseAccessor } from './index-value-accessor/promise-accessor';
import { PropertyValueAccessor } from './index-value-accessor/property-value-accessor';
import { SetKeyAccessor } from './index-value-accessor/set-key-accessor';
import { RsXCoreInjectionTokens } from './rs-x-core.injection-tokens';
import { ISequenceIdFactory } from './sequence-id/sequence-id-factory.interface';
import { SequenceIdFactory } from './sequence-id/sequence-id.factory';

export const RsXCoreModule = new ContainerModule((options) => {
   options
      .bind<Container>(RsXCoreInjectionTokens.IInjectionContainer)
      .toConstantValue(InjectionContainer);
   options
      .bind<IErrorLog>(RsXCoreInjectionTokens.IErrorLog)
      .to(ErrorLog)
      .inSingletonScope();

   registerMultiInjectServices(options, RsXCoreInjectionTokens.IIndexValueAccessorList,
      [
         { target: PropertyValueAccessor, token: RsXCoreInjectionTokens.IPropertyValueAccessor },
         { target: MethodAccessor, token: RsXCoreInjectionTokens.IMethodAccessor },
         { target: ArrayIndexAccessor, token: RsXCoreInjectionTokens.IArrayIndexAccessor },
         { target: MapKeyAccessor, token: RsXCoreInjectionTokens.IMapKeyAccessor },
         { target: SetKeyAccessor, token: RsXCoreInjectionTokens.ISetKeyAccessor },
         { target: ObservableAccessor, token: RsXCoreInjectionTokens.IObservableAccessor },
         { target: PromiseAccessor, token: RsXCoreInjectionTokens.IPromiseAccessor },
         { target: DatePropertyAccessor, token: RsXCoreInjectionTokens.IDatePropertyAccessor }
      ]
   );

   options
      .bind<IIndexValueAccessor>(RsXCoreInjectionTokens.IIndexValueAccessor)
      .to(IndexValueAccessor)
      .inSingletonScope();
   options
      .bind<IDeepClone>(RsXCoreInjectionTokens.IDeepClone)
      .to(DeepClone)
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
});
