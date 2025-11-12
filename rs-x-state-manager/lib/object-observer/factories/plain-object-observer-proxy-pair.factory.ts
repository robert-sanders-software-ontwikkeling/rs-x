import {
   IErrorLog,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
   truePredicate,
   Type,
} from '@rs-x-core';
import { IDisposableOwner } from '../../disposable-owner.interface';
import {
   IObjectPropertyObserverProxyPairManager,
   IObserverProxyPair,
} from '../../object-property-observer-proxy-pair-manager.type';
import { ObserverGroup } from '../../observer-group';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import { IObjectObserverProxyPairFactory } from '../object-observer-proxy-pair.factory.interface';

@Injectable()
export class PlainObjectObserverProxyPairFactory
   implements IObjectObserverProxyPairFactory
{
   constructor(
      @Inject(
         RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager
      )
      private readonly _objectPropertyObserverProxyPairManager: IObjectPropertyObserverProxyPairManager,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      private readonly _errorLog: IErrorLog
   ) {}

   public create(
      owner: IDisposableOwner,
      proxyTarget: IProxyTarget<Record<string, unknown>>
   ): IObserverProxyPair {
      const object = proxyTarget.target;
      const objectPropertyManager =
         this._objectPropertyObserverProxyPairManager.create(object).instance;
      const observers = Object.keys(object)
         .map(
            (key) =>
               objectPropertyManager.create({
                  key,
                  mustProxify: proxyTarget.mustProxify,
                  initializeManually: proxyTarget.initializeManually,
               }).instance
         )
         .filter((observerProxyPair) => observerProxyPair)
         .map((observerProxyPair) => observerProxyPair.observer);

      const observer = new ObserverGroup(
         owner,
         object,
         object,
         truePredicate,
         this._errorLog
      ).addObservers(observers);

      if (!proxyTarget.initializeManually) {
         observer.init();
      }

      return {
         observer,
         proxy: object,
         proxyTarget: object,
         emitChangeWhenSet: true,
         id: object,
      };
   }

   public applies(object: object): boolean {
      return Type.isPlainObject(object);
   }
}
