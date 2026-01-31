import {
   type IGuidFactory,
   Inject,
   Injectable,
   InvalidOperationException,
   RsXCoreInjectionTokens,
   SingletonFactoryWithGuid,
   Type
} from '@rs-x/core';

import type { IObserverProxyPair } from '../object-property-observer-proxy-pair-manager.type';
import type { IProxyRegistry } from '../proxies/proxy-registry/proxy-registry.interface';
import { RsXStateManagerInjectionTokens } from '../rs-x-state-manager-injection-tokens';

import type { IObjectObserverProxyPairFactoryProvider } from './object-observer-proxy-pair-factory.provider.interface';
import type {
   IObjectObserverProxyPairManager,
   IProxyTarget,
} from './object-observer-proxy-pair-manager.type';

@Injectable()
export class ObjectObserverProxyPairManager
   extends SingletonFactoryWithGuid<IProxyTarget<unknown>, IObserverProxyPair>
   implements IObjectObserverProxyPairManager
{
 
   constructor(
      @Inject(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProviderFactory
      )
      private readonly getObserverFactoryProvider: () => IObjectObserverProxyPairFactoryProvider,
      @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
      private readonly _proxyRegistry: IProxyRegistry,
      @Inject(RsXCoreInjectionTokens.IGuidFactory)
      guidFactory: IGuidFactory
   ) {
      super(guidFactory);
   }

   protected override getGroupId(data: IProxyTarget<unknown>): unknown {
     return data.target;
   }
   protected override getGroupMemberId(data: IProxyTarget<unknown>): unknown {
      return data.shouldWatchIndex;
   }

   public override create(data: IProxyTarget<unknown>): {
      referenceCount: number;
      instance: IObserverProxyPair<unknown>;
      id: string;
   } {
      if (this._proxyRegistry.isProxy(data.target)) {
         throw new InvalidOperationException(
            'Cannot create a proxy for a proxy'
         );
      }

      return super.create(data);
   }

   protected createInstance(
      objectObserverInfo: IProxyTarget<unknown>,
      id: string
   ): IObserverProxyPair {
      const factory = this.getObserverFactoryProvider().factories.find(
         (factory) => factory.applies(objectObserverInfo.target)
      );
      return factory
         ? factory.create(
              {
                 canDispose: () => this.getReferenceCount(id) === 1,
                 release: () => this.release(id),
              },
              objectObserverInfo
           )
         : Type.cast(null);
   }

   protected override releaseInstance(
      observerProxyPair: IObserverProxyPair
   ): void {
      observerProxyPair.observer.dispose();
   }
}
