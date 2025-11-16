import { DeepClone } from './deep-clone/deep-clone';
import { IDeepClone } from './deep-clone/deep-clone.interface';
import {
   Container,
   ContainerModule,
   InjectionContainer,
} from './dependency-injection';
import { EqualityService } from './equality-service/equality-service';
import { IEqualityService } from './equality-service/equality-service.interface';
import { ErrorLog } from './error-log/error-log';
import { IErrorLog } from './error-log/error-log.interface';
import { ArrayIndexAccessor } from './index-value-accessor/array-index-accessor';
import { IArrayIndexAccessor } from './index-value-accessor/array-index-accessor.type';
import { IndexValueAccessor } from './index-value-accessor/index-value-accessor';
import { IIndexValueAccessor } from './index-value-accessor/index-value-accessor.interface';
import { IndexValueAccessorProvider } from './index-value-accessor/index-value-accessor.provider';
import { IIndexValueAccessorProvider } from './index-value-accessor/index-value-accessor.provider.interface';
import { MapKeyAccessor } from './index-value-accessor/map-key-accessor';
import { IMapKeyAccessor } from './index-value-accessor/map-key-accessor.type';
import { MethodAccessor } from './index-value-accessor/method-accessor';
import { IMethodAccessor } from './index-value-accessor/method-accessor.type';
import { ObservableAccessor } from './index-value-accessor/observable-accessor';
import { IObservableAccessor } from './index-value-accessor/observable-accessor.interface';
import { PromiseAccessor } from './index-value-accessor/promise-accessor';
import { IPromiseAccessor } from './index-value-accessor/promise-accessor.interface';
import { PropertyValueAccessor } from './index-value-accessor/property-value-accessor';
import { IPropertyValueAccessor } from './index-value-accessor/property-value-accessor.type';
import { SetKeyAccessor } from './index-value-accessor/set-key-accessor';
import { ISetKeyAccessor } from './index-value-accessor/set-key-accessor.type';
import { RsXCoreInjectionTokens } from './rs-x-core.injection-tokens';

export const RsXCoreModule = new ContainerModule((options) => {
   options
      .bind<Container>(RsXCoreInjectionTokens.IInjectionContainer)
      .toConstantValue(InjectionContainer);
   options
      .bind<IErrorLog>(RsXCoreInjectionTokens.IErrorLog)
      .to(ErrorLog)
      .inSingletonScope();
      
   options.bind(PropertyValueAccessor).to(PropertyValueAccessor).inSingletonScope();
   options.bind(MethodAccessor).to(MethodAccessor).inSingletonScope();
   options.bind(ArrayIndexAccessor).to(ArrayIndexAccessor).inSingletonScope();
   options.bind(MapKeyAccessor).to(MapKeyAccessor).inSingletonScope();
   options.bind(SetKeyAccessor).to(SetKeyAccessor).inSingletonScope();
   options.bind(ObservableAccessor).to(ObservableAccessor).inSingletonScope();
   options.bind(PromiseAccessor).to(PromiseAccessor).inSingletonScope();


   options.bind(RsXCoreInjectionTokens.IPropertyValueAccessor).toService(PropertyValueAccessor);
   options.bind(RsXCoreInjectionTokens.IMethodAccessor).toService(MethodAccessor);
   options.bind(RsXCoreInjectionTokens.IArrayIndexAccessor).toService(ArrayIndexAccessor);
   options.bind(RsXCoreInjectionTokens.IMapKeyAccessor).toService(MapKeyAccessor);
   options.bind(RsXCoreInjectionTokens.ISetKeyAccessor).toService(SetKeyAccessor);
   options.bind(RsXCoreInjectionTokens.IObservableAccessor).toService(ObservableAccessor);
   options.bind(RsXCoreInjectionTokens.IPromiseAccessor).toService(PromiseAccessor);

   options
      .bind<IIndexValueAccessor>(RsXCoreInjectionTokens.IIndexValueAccessorList)
      .toService(PropertyValueAccessor);
   options
      .bind<IIndexValueAccessor>(RsXCoreInjectionTokens.IIndexValueAccessorList)
      .toService(MethodAccessor);
   options
      .bind<IIndexValueAccessor>(RsXCoreInjectionTokens.IIndexValueAccessorList)
      .toService(ArrayIndexAccessor);
   options
      .bind<IIndexValueAccessor>(RsXCoreInjectionTokens.IIndexValueAccessorList)
      .toService(MapKeyAccessor);
   options
      .bind<IIndexValueAccessor>(RsXCoreInjectionTokens.IIndexValueAccessorList)
      .toService(SetKeyAccessor);
   options
      .bind<IIndexValueAccessor>(RsXCoreInjectionTokens.IIndexValueAccessorList)
      .toService(ObservableAccessor);
   options
      .bind<IIndexValueAccessor>(RsXCoreInjectionTokens.IIndexValueAccessorList)
      .toService(PromiseAccessor)

   options
      .bind<IIndexValueAccessor>(RsXCoreInjectionTokens.IIndexValueAccessor)
      .to(IndexValueAccessor)
      .inSingletonScope();
   options
      .bind<IIndexValueAccessorProvider>(
         RsXCoreInjectionTokens.IIndexValueAccessorProvider
      )
      .to(IndexValueAccessorProvider)
      .inSingletonScope();
   options
      .bind<IDeepClone>(RsXCoreInjectionTokens.IDeepClone)
      .to(DeepClone)
      .inSingletonScope();
   options
      .bind<IEqualityService>(RsXCoreInjectionTokens.IEqualityService)
      .to(EqualityService)
      .inSingletonScope();

});
