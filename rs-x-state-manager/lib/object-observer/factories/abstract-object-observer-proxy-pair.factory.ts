import { type IDisposableOwner, type IErrorLog, type IIndexValueAccessor, truePredicate } from '@rs-x/core';
import { type IObjectPropertyObserverProxyPairManager, type IObserverProxyPair, type MustProxify } from '../../object-property-observer-proxy-pair-manager.type';
import { ObserverGroup } from '../../observer-group';
import { type IObserver } from '../../observer.interface';
import { type IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import { type IObjectObserverProxyPairFactory } from '../object-observer-proxy-pair.factory.interface';

export abstract class AbstractObjectObserverProxyPairFactory<
   TTarget,
   TData extends IProxyTarget<TTarget> = IProxyTarget<TTarget>,
> implements IObjectObserverProxyPairFactory<TTarget> {
   protected constructor(
      public readonly priority: number,
      private readonly _observerRootObserver: boolean,
      protected readonly _errorLog: IErrorLog,
      protected readonly _indexAccessor: IIndexValueAccessor,
      protected readonly _objectPropertyObserverProxyPairManager: IObjectPropertyObserverProxyPairManager
   ) { }

   public abstract applies(object: object): boolean;

   public create(
      owner: IDisposableOwner,
      data: TData
   ): IObserverProxyPair<TTarget> {
      const observerGroup = new ObserverGroup(
         this.createDisposableOwner(owner, data),
         data.target,
         data.target,
         truePredicate,
         this._errorLog,
         undefined,
         () => rootObserver?.observer,
         this._observerRootObserver
      );
      this.onObserverGroupCreate(data.target, observerGroup, data.mustProxify);
      const rootObserver = this.createRootObserver(data);
      if (!data.initializeManually) {
         observerGroup.init();
      }

      return {
         observer: observerGroup,
         proxy: rootObserver?.proxy,
         proxyTarget: rootObserver?.proxyTarget,
      };
   }

   protected createDisposableOwner(
      owner: IDisposableOwner,
      _data: TData
   ): IDisposableOwner {
      return owner;
   }

   protected abstract createRootObserver(
      data: TData
   ): IObserverProxyPair<TTarget> | undefined;


   protected onObserverGroupCreate(
      target: TTarget,
      observerGroup: ObserverGroup,
      mustProxify: MustProxify | undefined
   ): void {

      if(!mustProxify) {
         return;
      }

      const observers: IObserver[] = [];

      const indexes = this._indexAccessor.getIndexes(target);
      for (const index of indexes) {
         if (!mustProxify(index, target)) {
            continue;
         }
         const { observer } = this._objectPropertyObserverProxyPairManager.create(target).instance.create({
            key: index,
            mustProxify,

         }).instance;
         observers.push(observer);
      }

      observerGroup.replaceObservers(observers);
   }
}
