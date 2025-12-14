import {
   IEqualityService,
   IErrorLog,
   IIndexValueAccessor,
   Inject,
   Injectable,
   IPropertyChange,
   RsXCoreInjectionTokens,
   SingletonFactory,
} from '@rs-x/core';
import { Subscription } from 'rxjs';
import { AbstractObserver } from '../../../abstract-observer';
import { IDisposableOwner } from '../../../disposable-owner.interface';
import { IObjectObserverProxyPairManager } from '../../../object-observer';
import { IObserver } from '../../../observer.interface';
import { RsXStateManagerInjectionTokens } from '../../../rs-x-state-manager-injection-tokes';
import { IIndexObserverIdInfo, IIndexObserverInfo } from '../index-observer-info.interface';
import {
   Collection,
   ICollectionIndexObserverManager,
   ICollectionItemObserverManager,
} from './collection-item-observer-manager.type';

class CollectionIndexObserver extends AbstractObserver<Collection> {
   private readonly _changeSubscription: Subscription;
   private readonly _collectionObserver: IObserver;

   constructor(
      owner: IDisposableOwner,
      collection: Collection,
      index: unknown,
      private readonly _equalityService: IEqualityService,
      private readonly _indexValueAccessor: IIndexValueAccessor,
      private readonly _objectObserverProxyPairManager: IObjectObserverProxyPairManager,

      errorLog: IErrorLog,
   ) {
      super(owner, collection, _indexValueAccessor.getValue(collection, index), undefined, index);
      this._collectionObserver = this._objectObserverProxyPairManager.create({ target: collection }).instance.observer;

      this._changeSubscription = this._collectionObserver.changed.subscribe({
         next: this.onChanged,
         error: (e) =>
            errorLog.add({
               message: `Failed to handle change for ${collection.constructor.name} item for index '${index}'`,
               exception: e,
               context: collection,
               fatal: true,
            }),
      });
   }

   protected override disposeInternal(): void {
      super.disposeInternal();
      this._changeSubscription?.unsubscribe();
      this._collectionObserver.dispose();
   }

   private onChanged = (change: IPropertyChange) => {
      if (change.id !== this.id) {
         return;
      }

      if (!this._indexValueAccessor.hasValue(this.target, this.id)) {
         this.value = undefined;
         this.emitChange(change);
         return;
      }

      if (!this._equalityService.isEqual(this.value, change.newValue)) {
         this.value = change.newValue;
         this.emitChange(change);
      }
   }
}

class CollectionIndexObserverManager
   extends SingletonFactory<
      unknown,
      IIndexObserverInfo,
      IObserver
   >
   implements ICollectionIndexObserverManager {
   constructor(
      private readonly _collection: Collection,
      private readonly _errorLog: IErrorLog,
      private readonly _equalityService: IEqualityService,
      private readonly _indexValueAccessor: IIndexValueAccessor,
      private readonly _objectObserverProxyPairManager: IObjectObserverProxyPairManager,
      private readonly releaseObject: () => void
   ) {
      super();
   }

   public override getId(data: IIndexObserverIdInfo): unknown {
      return data.index;
   }

   protected override createId(data: IIndexObserverIdInfo):unknown {
      return data.index
   }

   protected override createInstance(
      data: IIndexObserverInfo,
      id: unknown
   ): IObserver {
      return new CollectionIndexObserver(
         {
            canDispose: () => this.getReferenceCount(id) === 1,
            release: () => this.release(id)
         },
         this._collection,
         data.index,
         this._equalityService,
         this._indexValueAccessor,
         this._objectObserverProxyPairManager,
         this._errorLog
      )
   }

   protected override releaseInstance(observer: IObserver): void {
      observer.dispose();
   }

   protected override onReleased(): void {
      this.releaseObject();
   }
}

@Injectable()
export class CollectionItemObserverManager
   extends SingletonFactory<
      Collection,
      Collection,
      ICollectionIndexObserverManager
   >
   implements ICollectionItemObserverManager {
   constructor(
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      private readonly _errorLog: IErrorLog,
      @Inject(RsXCoreInjectionTokens.IEqualityService)
      private readonly _equalityService: IEqualityService,
      @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
      private readonly _indexValueAccessor: IIndexValueAccessor,
      @Inject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager)
      private readonly _objectObserverProxyPairManager: IObjectObserverProxyPairManager,
   ) {
      super();
   }

   public override getId(collection: Collection): Collection {
      return collection;
   }

   protected override createId(collection: Collection): Collection {
      return collection;
   }

   protected override createInstance(
      collection: Collection
   ): ICollectionIndexObserverManager {
      return new CollectionIndexObserverManager(
         collection,
         this._errorLog,
         this._equalityService,
         this._indexValueAccessor,
         this._objectObserverProxyPairManager,
         () => this.release(collection)
      );
   }

   protected override releaseInstance(
      collectionIndexObserverManager: ICollectionIndexObserverManager
   ): void {
      collectionIndexObserverManager.dispose();
   }
}
