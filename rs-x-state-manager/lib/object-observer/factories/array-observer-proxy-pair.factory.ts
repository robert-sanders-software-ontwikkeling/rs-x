import {
   type IArrayIndexAccessor,
   type IErrorLog,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
} from '@rs-x/core';

import type { IObjectPropertyObserverProxyPairManager } from '../../object-property-observer-proxy-pair-manager.type';
import type { IArrayObserverProxyPair, IArrayProxyFactory } from '../../proxies/array-proxy/array-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../rs-x-state-manager-injection-tokens';
import type { IProxyTarget } from '../object-observer-proxy-pair-manager.type';

import { AbstractObjectObserverProxyPairFactory } from './abstract-object-observer-proxy-pair.factory';
import type { IArrayObserverProxyPairFactory } from './array-observer-proxy-pair.factory.type';

@Injectable()
export class ArrayObserverProxyPairFactory
   extends AbstractObjectObserverProxyPairFactory<unknown[]>
   implements IArrayObserverProxyPairFactory {

   constructor(
      @Inject(RsXStateManagerInjectionTokens.IArrayProxyFactory)
      private readonly _arrayProxyFactory: IArrayProxyFactory,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      errorLog: IErrorLog,
       @Inject(RsXCoreInjectionTokens.IArrayIndexAccessor)
      arrayIndexAccessor: IArrayIndexAccessor,
      @Inject(RsXStateManagerInjectionTokens.IObjectPropertyObserverProxyPairManager)
      objectPropertyObserverProxyPairManager: IObjectPropertyObserverProxyPairManager
      
   ) {
      super(5, true,errorLog, arrayIndexAccessor, objectPropertyObserverProxyPairManager);
   }

   public override applies(object: unknown): boolean {
      return Array.isArray(object);
   }

   protected override createRootObserver(data: IProxyTarget<unknown[]>): IArrayObserverProxyPair {
      return this._arrayProxyFactory.create({
         array: data.target,
      }).instance;
   }
}



