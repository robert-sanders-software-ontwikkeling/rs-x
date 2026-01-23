import { InjectionContainer, type Newable, registerMultiInjectService } from '../dependency-injection';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { type IDeepClone } from './deep-clone.interface';


export function DeepClone(serviceToken?: symbol) {
  return function (target: Newable<IDeepClone>) {
    registerMultiInjectService(InjectionContainer,target, {serviceToken, multiInjectToken: RsXCoreInjectionTokens.IDeepCloneList} )
    
  };
}