import {
   Injectable,
   MultiInject,
   SingletonFactory,
   SingletonFactoryWithGuid,
   UnsupportedException
} from '@rs-x/core';
import {
   IObjectPropertyObserverProxyPairManager,
   IObserverProxyPair,
   IPropertyIdInfo,
   IPropertyInfo,
   IPropertyObserverProxyPairManager,
   MustProxify,
} from './object-property-observer-proxy-pair-manager.type';
import { IPropertyObserverProxyPairFactory } from './property-observer/property-observer-proxy-pair.factory.interface';
import { RsXStateManagerInjectionTokens } from './rs-x-state-manager-injection-tokes';

class PropertyObserverProxyPairManager
   extends SingletonFactoryWithGuid<
      IPropertyInfo,
      IObserverProxyPair,
      IPropertyIdInfo
   >
   implements IPropertyObserverProxyPairManager {
   constructor(
      private readonly _object: unknown,
      private readonly _observerFactories: readonly IPropertyObserverProxyPairFactory[],
      private readonly releaseContext: () => void
   ) {
      super();
   }

   protected getGroupId(data: IPropertyInfo): unknown {
      return data.key;
   }

   protected getGroupMemberId(data: IPropertyInfo): MustProxify {
      return data.mustProxify;
   }
   x;
   protected createInstance(
      propertyInfo: IPropertyInfo,
      id: string
   ): IObserverProxyPair {
      return this.getObserverFactory(propertyInfo).create(
         {
            canDispose: () => this.getReferenceCount(id) === 1,
            release: () => {
               propertyInfo.owner?.release();
               this.release(id);
            },
         },
         this._object,
         propertyInfo
      );
   }

   protected override releaseInstance(
      observerProxyPair: IObserverProxyPair
   ): void {
      observerProxyPair.observer.dispose();
   }

   protected override onReleased(): void {
      this.releaseContext();
   }

   private getObserverFactory(
      propertyInfo: IPropertyInfo
   ): IPropertyObserverProxyPairFactory {
      const observerFactory = this._observerFactories.find((observerFactory) =>
         observerFactory.applies(this._object, propertyInfo)
      );

      if (!observerFactory) {
         throw new UnsupportedException(
            `No observer factory found for given object of type ${this._object.constructor.name} for given id ${propertyInfo.key}`
         );
      }

      return observerFactory;
   }
}

@Injectable()
export class ObjectPropertyObserverProxyPairManager
   extends SingletonFactory<unknown, unknown, IPropertyObserverProxyPairManager>
   implements IObjectPropertyObserverProxyPairManager {
   constructor(
      @MultiInject(
         RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList
      )
      private readonly _factories: IPropertyObserverProxyPairFactory[]
   ) {
      super();
   }

   public getId(context: unknown): unknown {
      return context;
   }

   protected createId(context: unknown): unknown {
      return context;
   }

   protected createInstance(
      context: unknown
   ): IPropertyObserverProxyPairManager {
      return new PropertyObserverProxyPairManager(
         context,
         this._factories,
         () => this.release(context)
      );
   }
}
