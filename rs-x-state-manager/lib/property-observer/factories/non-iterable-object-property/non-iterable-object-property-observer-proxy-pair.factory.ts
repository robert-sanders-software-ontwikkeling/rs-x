import {
   IErrorLog,
   IIndexValueAccessor,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
   Type,
} from '@rs-x-core';
import { IObjectObserverProxyPairManager } from '../../../object-observer/object-observer-proxy-pair-manager.type';
import { IPropertyInfo } from '../../../object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from '../../../rs-x-state-manager-injection-tokes';
import { IndexObserverProxyPairFactory } from '../indexed-value-observer-proxy-pair/indexed-value-observer-proxy-pair.factory';
import { IObjectPropertyObserverManager } from './object-property-observer-manager.type';

@Injectable()
export class NonIterableObjectPropertyObserverProxyPairFactory extends IndexObserverProxyPairFactory<
   object,
   string
> {
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager)
      objectObserveryManager: IObjectObserverProxyPairManager,
      @Inject(RsXStateManagerInjectionTokens.IObjectPropertyObserverManager)
      objectPropertyObserverManager: IObjectPropertyObserverManager,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      errorLog: IErrorLog,
      @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
      indexValueAccessor: IIndexValueAccessor
   ) {
      super(
         objectObserveryManager,
         objectPropertyObserverManager,
         errorLog,
         indexValueAccessor
      );
   }

   public applies(object: unknown, propertyInfo: IPropertyInfo): boolean {
      return (
         !(
            Array.isArray(object) ||
            object instanceof Map ||
            object instanceof Set
         ) && Type.isString(propertyInfo.key)
      );
   }

   protected setIndexValue(object: object, key: string, value: unknown): void {
      object[key] = value;
   }
}
