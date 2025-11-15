import {
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
import { ISetProxyFactory } from '../../../proxies/set-proxy/set-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../../rs-x-state-manager-injection-tokes';
import {
   ISetItemObserverManager,
   ISetKeyObserverIdInfo,
   ISetKeyObserverInfo,
   ISetKeyObserverManager,
} from './set-item-observer-manager.type';

class SetItemObserver extends AbstractObserver<Set<unknown>> {
   private readonly _setChangeSubscription: Subscription;

   constructor(
      owner: IDisposableOwner,
      target: Set<unknown>,
      item: unknown,
      private readonly _mapObserver: IObserver,
      private readonly _errorLog: IErrorLog
   ) {
      super(owner, target, item, undefined, item);

      this._setChangeSubscription = this._mapObserver.changed.subscribe({
         next: this.onSetChanged,
         error: (e) =>
            this._errorLog.add({
               message: `Failed to handle change for set item`,
               exception: e,
               context: target,
               fatal: true,
            }),
      });
   }

   protected override disposeInternal(): void {
      this._setChangeSubscription.unsubscribe();
   }

   private onSetChanged = (change: IPropertyChange) => {
      if (change.id !== this.id) {
         return;
      }

      if (!this.target.has(this.id)) {
         this.emitChange(change);
         return;
      }
   };
}

class SetKeyObserverManager
   extends SingletonFactory<
      MustProxify,
      ISetKeyObserverInfo,
      IObserver,
      ISetKeyObserverIdInfo
   >
   implements ISetKeyObserverManager
{
   constructor(
      private readonly _set: Set<unknown>,
      private readonly _setProxyFactory: ISetProxyFactory,
      private readonly _errorLog: IErrorLog,
      private readonly releaseObject: () => void
   ) {
      super();
   }

   public override getId(data: ISetKeyObserverIdInfo): MustProxify {
      return data.mustProxify;
   }

   protected override createId(data: ISetKeyObserverIdInfo): MustProxify {
      return data.mustProxify;
   }

   protected override createInstance(
      data: ISetKeyObserverInfo,
      id: MustProxify
   ): IObserver {
      const setObserver = this._setProxyFactory.create({
         set: this._set,
         mustProxify: data.mustProxify,
      }).instance.observer;
      return new SetItemObserver(
         {
            canDispose: () => this.getReferenceCount(id) === 1,
            release: () => {
               setObserver.dispose();
               this.release(id);
            },
         },
         this._set,
         data.index,
         setObserver,
         this._errorLog
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
export class SetItemObserverManager
   extends SingletonFactory<Set<unknown>, Set<unknown>, ISetKeyObserverManager>
   implements ISetItemObserverManager
{
   constructor(
      @Inject(RsXStateManagerInjectionTokens.ISetProxyFactory)
      private readonly _setProxyFactory: ISetProxyFactory,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      private readonly _errorLog: IErrorLog
   ) {
      super();
   }

   public override getId(context: Set<unknown>): Set<unknown> {
      return context;
   }

   protected override createId(context: Set<unknown>): Set<unknown> {
      return context;
   }

   protected override createInstance(
      context: Set<unknown>
   ): SetKeyObserverManager {
      return new SetKeyObserverManager(
         context,
         this._setProxyFactory,
         this._errorLog,
         () => this.release(context)
      );
   }

   protected override releaseInstance(
      setKeyObserverManager: ISetKeyObserverManager
   ): void {
      setKeyObserverManager.dispose();
   }
}
