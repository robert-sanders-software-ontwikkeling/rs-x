import {
   IErrorLog,
   Inject,
   Injectable,
   ISetKeyAccessor,
   RsXCoreInjectionTokens
} from '@rs-x/core';
import {
   ISetObserverProxyPair,
   ISetProxyFactory,
} from '../../proxies/set-proxy/set-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokes';
import { IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import { AbstractObjectObserverProxyPairFactory } from './abstract-object-observer-proxy-pair.factory';
import { ISetObserverProxyPairFactory } from './set-observer-proxy-pair.factory.type';
import { IObjectPropertyObserverProxyPairManager } from '../../object-property-observer-proxy-pair-manager.type';

@Injectable()
export class SetObserverProxyPairFactory
   extends AbstractObjectObserverProxyPairFactory<Set<unknown>>
   implements ISetObserverProxyPairFactory {

   constructor(
      @Inject(RsXStateManagerInjectionTokens.ISetProxyFactory)
      private readonly _setProxyFactory: ISetProxyFactory,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      errorLog: IErrorLog,
      @Inject(RsXCoreInjectionTokens.ISetKeyAccessor)
      setKeyAccessor: ISetKeyAccessor,
      @Inject(RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager)
      objectPropertyObserverProxyPairManager: IObjectPropertyObserverProxyPairManager
     
   ) {
      super(1, true,errorLog, setKeyAccessor, objectPropertyObserverProxyPairManager);
   }

   public override applies(object: unknown): boolean {
      return object instanceof Set;
   }

   protected override createRootObserver(data: IProxyTarget<Set<unknown>>): ISetObserverProxyPair {
      return this._setProxyFactory.create({
         set: data.target,
      }).instance;
   }
}

