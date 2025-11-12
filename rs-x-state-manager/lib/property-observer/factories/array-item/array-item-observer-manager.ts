import {
   IEqualityService,
   IErrorLog,
   Inject,
   Injectable,
   IPropertyChange,
   RsXCoreInjectionTokens,
   SingletonFactory,
} from '@rs-x-core';
import { Subject, Subscription } from 'rxjs';
import { AbstractObserver } from '../../../abstract-observer';
import { IDisposableOwner } from '../../../disposable-owner.interface';
import { MustProxify } from '../../../object-property-observer-proxy-pair-manager.type';
import { IObserver } from '../../../observer.interface';
import { IArrayProxyFactory } from '../../../proxies/array-proxy/array-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../../rs-x-state-manager-injection-tokes';
import {
   IArrayIndexObserverInfo,
   IArrayIndexObserverManager,
   IArrayItemObserverManager,
} from './array-item-observer-manager.type';

class ArrayItemObserver extends AbstractObserver<
   readonly unknown[],
   unknown,
   number
> {
   private _oldValue: unknown;
   private _changeSubscription: Subscription;

   constructor(
      owner: IDisposableOwner,
      target: readonly unknown[],
      id: number,
      private readonly _arrayObserver: IObserver,
      private readonly _errorLog: IErrorLog,
      private readonly _equalityService: IEqualityService
   ) {
      super(owner, target, target[id], new Subject<IPropertyChange>(), id);

      this._oldValue = this.target[this.id];
      this._changeSubscription = this._arrayObserver.changed.subscribe({
         next: this.onArrayChanged,
         error: (e) =>
            this._errorLog.add({
               message: `Failed to handle change for array item at index ${id}`,
               exception: e,
               context: target,
               fatal: true,
            }),
      });
   }

   protected override disposeInternal(): void {
      this._changeSubscription.unsubscribe();
   }

   private onArrayChanged = (change: IPropertyChange) => {
      if (change.id !== this.id) {
         return;
      }

      if (this.id >= this.target.length) {
         this.emitChange(change);
      } else if (
         !this._equalityService.isEqual(this.target[this.id], this._oldValue)
      ) {
         this.emitChange(change);
         this._oldValue = this.target[this.id];
      }
   };
}

class ArrayIndexObserverManager
   extends SingletonFactory<
      MustProxify | number,
      IArrayIndexObserverInfo,
      IObserver
   >
   implements IArrayIndexObserverManager
{
   constructor(
      private readonly _array: unknown[],
      private readonly _arrayProxyFactory: IArrayProxyFactory,
      private readonly _errorLog: IErrorLog,
      private readonly _equalityService: IEqualityService,
      private readonly releaseArray: () => void
   ) {
      super();
   }

   public override getId(data: IArrayIndexObserverInfo): MustProxify | number {
      return data.mustProxify ?? data.index;
   }

   public override createId(
      data: IArrayIndexObserverInfo
   ): MustProxify | number {
      return data.mustProxify ?? data.index;
   }

   protected override createInstance(
      data: IArrayIndexObserverInfo,
      id: MustProxify
   ): IObserver {
      const arrayObserverProxyPair = this._arrayProxyFactory.create({
         array: this._array,
         mustProxify: data.mustProxify,
      }).instance;
      return new ArrayItemObserver(
         {
            canDispose: () => this.getReferenceCount(id) === 1,
            release: () => {
               this._arrayProxyFactory.release(arrayObserverProxyPair.id);
               this.release(id);
               data.owner?.release();
            },
         },
         this._array,
         data.index,
         arrayObserverProxyPair.observer,
         this._errorLog,
         this._equalityService
      );
   }

   protected override releaseInstance(observer: IObserver): void {
      observer.dispose();
   }

   protected override onReleased(): void {
      this.releaseArray();
   }
}

@Injectable()
export class ArrayItemObserverManager
   extends SingletonFactory<unknown[], unknown[], IArrayIndexObserverManager>
   implements IArrayItemObserverManager
{
   constructor(
      @Inject(RsXStateManagerInjectionTokens.IArrayProxyFactory)
      private readonly _arrayProxyFactory: IArrayProxyFactory,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      private readonly _errorLog: IErrorLog,
      @Inject(RsXCoreInjectionTokens.IEqualityService)
      private readonly _equalityService: IEqualityService
   ) {
      super();
   }

   public override getId(context: unknown[]): unknown[] {
      return context;
   }

   protected override createId(context: unknown[]): unknown[] {
      return context;
   }

   protected override createInstance(
      context: unknown[]
   ): IArrayIndexObserverManager {
      return new ArrayIndexObserverManager(
         context,
         this._arrayProxyFactory,
         this._errorLog,
         this._equalityService,
         () => this.release(context)
      );
   }

   protected override releaseInstance(
      indexObserverManager: IArrayIndexObserverManager
   ): void {
      indexObserverManager.dispose();
   }
}
