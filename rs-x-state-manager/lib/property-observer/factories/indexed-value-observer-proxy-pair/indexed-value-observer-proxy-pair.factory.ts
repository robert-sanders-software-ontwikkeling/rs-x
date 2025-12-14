import {
   IErrorLog,
   IIndexValueAccessor,
   IPropertyChange,
   truePredicate,
   Type,
} from '@rs-x/core';
import { IDisposableOwner } from '../../../disposable-owner.interface';
import { IObjectObserverProxyPairManager } from '../../../object-observer/object-observer-proxy-pair-manager.type';
import {
   IObserverProxyPair,
   IPropertyInfo,
   MustProxify,
} from '../../../object-property-observer-proxy-pair-manager.type';
import { ObserverGroup } from '../../../observer-group';
import { IObserver } from '../../../observer.interface';
import { IProxyRegistry } from '../../../proxies/proxy-registry/proxy-registry.interface';
import { IIndexObserverProxyPairFactory } from '../../index-observer-proxy-pair.factory.interface';
import {
   IIndexSetObserverManager,
   IndexChangeSubscriptionManager,
} from './index-change-subscription-manager';

export abstract class IndexObserverProxyPairFactory<TContext, TIndex>
   implements IIndexObserverProxyPairFactory<TContext> {
   private readonly _indexChangeSubscriptionManager: IndexChangeSubscriptionManager<TIndex>;

   protected constructor(
      private readonly _objectObserveryManager: IObjectObserverProxyPairManager,
      indexSetObserverManager: IIndexSetObserverManager<TIndex>,
      errorLog: IErrorLog,
      protected readonly _indexValueAccessor: IIndexValueAccessor,
      private readonly _proxyRegister: IProxyRegistry,
      private readonly mustHandleChange?: (change: IPropertyChange) => boolean,

   ) {
      this._indexChangeSubscriptionManager =
         new IndexChangeSubscriptionManager<TIndex>(
            indexSetObserverManager,
            errorLog
         );
   }

   public dispose(): void {
      this._indexChangeSubscriptionManager.dispose();
   }

   public abstract applies(
      object: unknown,
      propertyInfo: IPropertyInfo
   ): boolean;

   public create(
      owner: IDisposableOwner,
      object: TContext,
      propertyInfo: IPropertyInfo
   ): IObserverProxyPair<TContext> {
      const index = propertyInfo.key as TIndex;
      const valueAtIndex = this._indexValueAccessor.getValue(object, index);
      const mustProxify = this.getMustProxifyHandler(
         propertyInfo.mustProxify,
         object,
         index
      );
      const indexValueObserverProxyPair = mustProxify
         ? this.createIndexValueProxy(
            propertyInfo,
            object,
            index,
            valueAtIndex,
            mustProxify
         )
         : undefined;
      // If we observe the index value than we ask the observer to provide the initial value
      // For example for promise observer we don't want to use the index value because the value
      // will be a promise and the value should be the resolved value. In this case the initial
      // value should be undefined and the resolved value will be emitted later
      const initialValue = indexValueObserverProxyPair
         ? indexValueObserverProxyPair.observer.value
         : valueAtIndex;;
      const groupObserver = this.createGroupObserver(
         owner,
         object,
         index,
         initialValue,
         propertyInfo.initializeManually,
         indexValueObserverProxyPair?.observer,
         mustProxify
      );
      return {
         observer: groupObserver,
         proxy: indexValueObserverProxyPair?.proxy as TContext,
         proxyTarget: valueAtIndex as TContext,
      };
   }

   private getMustProxifyHandler(
      mustProxify: MustProxify,
      context: unknown,
      index: unknown
   ): MustProxify {
      if (mustProxify) {
         return mustProxify;
      }
      return this._indexValueAccessor.isAsync(context, index)
         ? truePredicate
         : undefined;
   }

   private createIndexValueProxy(
      propertyInfo: IPropertyInfo,
      object: TContext,
      index: TIndex,
      value: unknown,
      mustProxify: MustProxify
   ): IObserverProxyPair | undefined {
      const setValue =
         propertyInfo.setValue ??
         ((v: unknown) => this._indexValueAccessor.setValue(object, index, v));
      return this.proxifyIndexValue(
         value,
         mustProxify,
         propertyInfo.initializeManually,
         setValue
      );
   }

   private createGroupObserver(
      owner: IDisposableOwner,
      object: TContext,
      index: TIndex,
      initialValue: unknown,
      initializeManually: boolean,
      indexValueObserver: IObserver,
      mustProxify: MustProxify
   ): ObserverGroup {
      const indexChangeSubscriptionsForContextManager =
         this._indexChangeSubscriptionManager.create(object).instance;
      const { id } = indexChangeSubscriptionsForContextManager.create({
         index,
         initialValue,
         indexValueObserver,
         mustProxify,
         initializeManually,
         mustHandleChange: this.mustHandleChange,
         onChanged: (change: IPropertyChange) =>
            this.onIndexSet(change, id, mustProxify),
         owner,
      });
      return indexChangeSubscriptionsForContextManager.getSubsriptionData(id);
   }

   private onIndexSet(
      change: IPropertyChange,
      subsriptionId: string,
      mustProxify: MustProxify
   ): void {

      const emitValue = Type.isNullOrUndefined(change.newValue) ||
         !this._indexValueAccessor.isAsync(change.target, change.id);
      const observerGroup = this._indexChangeSubscriptionManager
         .getFromId(change.target)
         .getSubsriptionData(subsriptionId);

      if (emitValue) {
         observerGroup.emitValue(change.newValue);
      }

      const observers = this.getNestedObservers(
         change,
         mustProxify
      );

      observerGroup.replaceObservers(observers);
   }

   private getNestedObservers(
      change: IPropertyChange,
      mustProxify: MustProxify
   ): IObserver[] {
      const mustProxifyHandler = this.getMustProxifyHandler(
         mustProxify,
         change.target,
         change.id
      );

      let observers: IObserver[] = [];
      if (mustProxifyHandler) {
         const observerProxyPair = this.proxifyIndexValue(
            change.newValue,
            mustProxifyHandler,
            true,
            change.setValue ??
            ((value: unknown) => {
               change.target[change.id as string] = value;
            })
         );

         if (observerProxyPair) {
            observers.push(observerProxyPair.observer);

         }
      }
      return observers;
   }

   private proxifyIndexValue(
      value: unknown,
      mustProxify: MustProxify,
      initializeManually: boolean,
      setValue: (value: unknown) => void
   ): IObserverProxyPair {

      const target = this._proxyRegister.getProxyTarget(value) ?? value;
      const observerProxyPair = this._objectObserveryManager.create({
         target,
         mustProxify,
         initializeManually,
      }).instance;
      if (!observerProxyPair) {
         return null;
      }

      if (observerProxyPair.proxy !== undefined) {
         setValue(observerProxyPair.proxy);
      }

      return observerProxyPair;
   }
}
