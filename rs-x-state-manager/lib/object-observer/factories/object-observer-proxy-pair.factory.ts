import { IErrorLog, truePredicate } from '@rs-x-core';
import { IDisposableOwner } from '../../disposable-owner.interface';
import { IObserverProxyPair } from '../../object-property-observer-proxy-pair-manager.type';
import { ObserverGroup } from '../../observer-group';
import { IProxyTarget } from '../object-observer-proxy-pair-manager.type';
import { IObjectObserverProxyPairFactory } from '../object-observer-proxy-pair.factory.interface';

export abstract class ObjectObserverProxyPairFactory<
   TTarget,
   TId,
   TData extends IProxyTarget<TTarget> = IProxyTarget<TTarget>,
> implements IObjectObserverProxyPairFactory<TTarget, TId>
{
   protected constructor(
      private readonly _observerRootObserver: boolean,
      private readonly _errorLog: IErrorLog
   ) {}

   public abstract applies(object: object): boolean;

   public create(
      owner: IDisposableOwner,
      data: TData
   ): IObserverProxyPair<TTarget, TId> {
      const observerGroup = new ObserverGroup(
         this.createDisposableOwner(owner, data),
         data.target,
         data.target,
         truePredicate,
         this._errorLog,
         undefined,
         () => rootObserver.observer,
         this._observerRootObserver
      );
      this.onObserverGroupCreate(data.target, observerGroup);
      const rootObserver = this.createRootObserverInternal(data);
      if (!data.initializeManually) {
         observerGroup.init();
      }

      return {
         observer: observerGroup,
         proxy: rootObserver.proxy,
         proxyTarget: rootObserver.proxyTarget,
         id: rootObserver.id,
         emitChangeWhenSet: this.emitChangeWhenSet,
      };
   }

   protected get emitChangeWhenSet(): boolean {
      return true;
   }

   protected abstract createDisposableOwner(
      owner: IDisposableOwner,
      data: TData
   ): IDisposableOwner;
   protected abstract createRootObserver(
      data: TData
   ): IObserverProxyPair<TTarget, TId>;
   protected onObserverGroupCreate(
      _target: TTarget,
      _observerGroup: ObserverGroup
   ): void {}

   private createRootObserverInternal(
      data: TData
   ): IObserverProxyPair<TTarget, TId> {
      return this.createRootObserver(data);
   }
}
