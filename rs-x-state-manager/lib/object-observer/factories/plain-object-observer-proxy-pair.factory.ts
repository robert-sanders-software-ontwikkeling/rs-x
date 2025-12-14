import {
   IErrorLog,
   Inject,
   Injectable,
   IPropertyValueAccessor,
   RsXCoreInjectionTokens,
   truePredicate,
   Type
} from '@rs-x/core';
import {
   IObjectPropertyObserverProxyPairManager,
   IObserverProxyPair
} from '../../object-property-observer-proxy-pair-manager.type';
import { ObserverGroup } from '../../observer-group';
import { IObserver } from '../../observer.interface';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import { ObjectObserverProxyPairFactory } from './object-observer-proxy-pair.factory';
import { IPlainObjectObserverProxyPairFactory } from './plain-object-observer-proxy-pair.factory.type';

@Injectable()
export class PlainObjectObserverProxyPairFactory
   extends ObjectObserverProxyPairFactory<Record<string, unknown>>
   implements IPlainObjectObserverProxyPairFactory {
   constructor(
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      errorLog: IErrorLog,
      @Inject(RsXCoreInjectionTokens.IPropertyValueAccessor)
      propertyValueAccessor: IPropertyValueAccessor,
      @Inject(RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager)
      objectPropertyObserverProxyPairManager: IObjectPropertyObserverProxyPairManager
   ) {
      super(true, errorLog, propertyValueAccessor, objectPropertyObserverProxyPairManager);
   }

   public applies(object: object): boolean {
      return Type.isPlainObject(object);
   }

   protected override createRootObserver(data: IProxyTarget<Record<string, unknown>>): IObserverProxyPair<Record<string, unknown>> {
      if(data.mustProxify) {
         return undefined;
      }
     
      const target = data.target;
      const observers: IObserver[] = [];

      for (const index of this._indexAccessor.getIndexes(target)) {
         const { observer } = this._objectPropertyObserverProxyPairManager.create(target).instance.create({
            key: index,
         }).instance;
         observers.push(observer);
      }

      if (observers.length === 0) {
         return undefined;
      }

      const observerGroup = new ObserverGroup(
         undefined,
         data.target,
         data.target,
         truePredicate,
         this._errorLog,
      );

      observerGroup.replaceObservers(observers);
      return {
         observer: observerGroup,
      };
   }
}

