import { InjectionContainer, Newable, registerMultiInjectService } from '../dependency-injection';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { IIndexValueAccessor } from './index-value-accessor.interface';


export function IndexAccessor(serviceToken?: symbol) {
  return function (target: Newable<IIndexValueAccessor>) {
    registerMultiInjectService(InjectionContainer,target, {serviceToken, multiInjectToken: RsXCoreInjectionTokens.IIndexValueAccessorList} )
    
  };
}