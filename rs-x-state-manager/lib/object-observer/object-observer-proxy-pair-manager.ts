import {
   Inject,
   Injectable,
   InvalidOperationException,
   SingletonFactory,
} from '@rs-x/core';
import { IObserverProxyPair } from '../object-property-observer-proxy-pair-manager.type';
import { IProxyRegistry } from '../proxies/proxy-registry/proxy-registry.interface';
import { RsXStateManagerInjectionTokens } from '../rs-x-state-manager-injection-tokes';
import { IObjectObserverProxyPairFactoryProvider } from './object-observer-proxy-pair-factory.provider.interface';
import {
   IObjectObserverProxyPairManager,
   IProxyTarget,
} from './object-observer-proxy-pair-manager.type';

@Injectable()
export class ObjectObserverProxyPairManager
   extends SingletonFactory<unknown, IProxyTarget<unknown>, IObserverProxyPair>
   implements IObjectObserverProxyPairManager
{
   constructor(
      @Inject(
         RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProviderFactory
      )
      private readonly getObserverFactoryProvider: () => IObjectObserverProxyPairFactoryProvider,
      @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
      private readonly _proxyRegistry: IProxyRegistry
   ) {
      super();
   }

   public getId(proxyTarget: IProxyTarget<unknown>): unknown {
      return proxyTarget.target;
   }

   public override create(data: IProxyTarget<unknown>): {
      referenceCount: number;
      instance: IObserverProxyPair<unknown, unknown>;
      id: unknown;
   } {
      if (this._proxyRegistry.isProxy(data.target)) {
         throw new InvalidOperationException(
            'Cannot create a proxy for a proxy'
         );
      }

      return super.create(data);
   }

   protected createId(proxyTarget: IProxyTarget<unknown>): unknown {
      return proxyTarget.target;
   }

   protected createInstance(
      objectObserverInfo: IProxyTarget<unknown>,
      id: unknown
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
         : null;
   }

   protected override releaseInstance(
      observerProxyPair: IObserverProxyPair
   ): void {
      observerProxyPair.observer.dispose();
   }
}
