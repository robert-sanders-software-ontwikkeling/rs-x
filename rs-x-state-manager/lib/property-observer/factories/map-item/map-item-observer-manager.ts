import {
   IEqualityService,
   IErrorLog,
   Inject,
   Injectable,
   IPropertyChange,
   RsXCoreInjectionTokens,
   SingletonFactory,
} from '@rs-x/core';
import { Subscription } from 'rxjs';
import { AbstractObserver } from '../../../abstract-observer';
import { IDisposableOwner } from '../../../disposable-owner.interface';
import { MustProxify } from '../../../object-property-observer-proxy-pair-manager.type';
import { IObserver } from '../../../observer.interface';
import { IMapProxyFactory } from '../../../proxies/map-proxy/map-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../../rs-x-state-manager-injection-tokes';
import {
   IMapItemObserverManager,
   IMapKeyObserverIdInfo,
   IMapKeyObserverInfo,
   IMapKeyObserverManager,
} from './map-item-observer-manager.type';

class MapItemObserver extends AbstractObserver<Map<unknown, unknown>> {
   private _oldValue: unknown;
   private readonly _mapChangeSubscription: Subscription;

   constructor(
      owner: IDisposableOwner,
      target: Map<unknown, unknown>,
      id: unknown,
      private readonly _mapObserver: IObserver,
      private readonly _errorLog: IErrorLog,
      private readonly _equalityService: IEqualityService
   ) {
      super(owner, target, target.get(id), undefined, id);

      this._oldValue = this.initialValue;
      this._mapChangeSubscription = this._mapObserver.changed.subscribe({
         next: this.onMapChanged,
         error: (e) =>
            this._errorLog.add({
               message: `Failed to handle change for map item for key ${id}`,
               exception: e,
               context: target,
               fatal: true,
            }),
      });
   }

   protected override disposeInternal(): void {
      this._mapObserver.dispose();
      this._mapChangeSubscription.unsubscribe();
   }

   private onMapChanged = (change: IPropertyChange) => {
      if (change.id !== this.id) {
         return;
      }

      if (!this.target.has(this.id)) {
         this.emitChange(change);
         return;
      }

      const value = this.target.get(this.id);

      if (this._equalityService.isEqual(value, this._oldValue)) {
         return;
      }

      this.emitChange(change);
      this._oldValue = value;
   };
}

class MapKeyObserverManager
   extends SingletonFactory<
      MustProxify | unknown,
      IMapKeyObserverInfo,
      IObserver,
      IMapKeyObserverIdInfo
   >
   implements IMapKeyObserverManager
{
   constructor(
      private readonly _map: Map<unknown, unknown>,
      private readonly _mapProxyFactory: IMapProxyFactory,
      private readonly _errorLog: IErrorLog,
      private readonly _equalityService: IEqualityService,
      private readonly releaseObject: () => void
   ) {
      super();
   }

   public override getId(data: IMapKeyObserverIdInfo): MustProxify | unknown {
      return data.mustProxify ?? data.index;
   }

   protected override createId(
      data: IMapKeyObserverIdInfo
   ): MustProxify | unknown {
      return data.mustProxify ?? data.index;
   }

   protected override createInstance(
      data: IMapKeyObserverInfo,
      id: MustProxify
   ): IObserver {
      const mapObserver = this._mapProxyFactory.create({
         map: this._map,
         mustProxify: data.mustProxify,
      }).instance.observer;
      return new MapItemObserver(
         {
            canDispose: () => this.getReferenceCount(id) === 1,
            release: () => this.release(id)
         },
         this._map,
         data.index,
         mapObserver,
         this._errorLog,
         this._equalityService
      );
   }

   protected override releaseInstance(observer: IObserver): void {
      observer.dispose();
   }

   protected override onReleased(): void {
      this.releaseObject();
   }
}

@Injectable()
export class MapItemObserverManager
   extends SingletonFactory<
      Map<unknown, unknown>,
      Map<unknown, unknown>,
      IMapKeyObserverManager
   >
   implements IMapItemObserverManager
{
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IMapProxyFactory)
      private readonly _mapProxyFactory: IMapProxyFactory,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      private readonly _errorLog: IErrorLog,
      @Inject(RsXCoreInjectionTokens.IEqualityService)
      private readonly _equalityService: IEqualityService
   ) {
      super();
   }

   public override getId(
      context: Map<unknown, unknown>
   ): Map<unknown, unknown> {
      return context;
   }

   protected override createId(
      context: Map<unknown, unknown>
   ): Map<unknown, unknown> {
      return context;
   }

   protected override createInstance(
      context: Map<unknown, unknown>
   ): IMapKeyObserverManager {
      return new MapKeyObserverManager(
         context,
         this._mapProxyFactory,
         this._errorLog,
         this._equalityService,
         () => this.release(context)
      );
   }

   protected override releaseInstance(
      mapKeyObserverManager: IMapKeyObserverManager
   ): void {
      mapKeyObserverManager.dispose();
   }
}
