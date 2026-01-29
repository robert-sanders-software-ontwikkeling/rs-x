import { type IErrorLog, type IGuidFactory, SingletonFactory } from '@rs-x/core';

import { GroupedChangeSubscriptionsForContextManager } from '../../grouped-change-subscriptions-for-context-manager';
import {
   type IObjectPropertyObserverProxyPairManager,
   type MustProxify,
} from '../../object-property-observer-proxy-pair-manager.type';
import { type IObserver } from '../../observer.interface';

import {
   type IStateChangeSubscriptionIdInfo,
   type IStateChangeSubscriptionInfo,
   type IStateChangeSubscriptionManager,
   type IStateChangeSubscriptionsForContextManager,
} from './state-change-subsription-manager.interface';

class StateChangeSubscriptionsForContextManager
   extends GroupedChangeSubscriptionsForContextManager<
      undefined,
      IStateChangeSubscriptionInfo,
      IStateChangeSubscriptionIdInfo
   >
   implements IStateChangeSubscriptionsForContextManager
{
   constructor(
      context: unknown,
      releaseContext: () => void,
      private readonly _objectObserverManager: IObjectPropertyObserverProxyPairManager,
      errorLog: IErrorLog,
      guidFactory: IGuidFactory,
   ) {
      super(context, releaseContext, errorLog, guidFactory);
   }

   protected getGroupId(data: IStateChangeSubscriptionIdInfo): unknown {
      return data.key;
   }

   protected getGroupMemberId(
      data: IStateChangeSubscriptionIdInfo
   ): MustProxify | undefined {
      return data.mustProxify;
   }

   protected createObserver(
      context: unknown,
      data: IStateChangeSubscriptionInfo,
      id: string
   ): { subscriptionData: undefined; observer: IObserver } {
      const objectObserver =
         this._objectObserverManager.create(context).instance;
      const observer = objectObserver.create({
         key: data.key,
         initializeManually: true,
         mustProxify: data.mustProxify,
         owner: {
            release: () => this.release(id),
         },
      }).instance.observer;

      return {
         observer,
         subscriptionData: undefined,
      };
   }
}

export class StateChangeSubscriptionManager
   extends SingletonFactory<
      unknown,
      unknown,
      IStateChangeSubscriptionsForContextManager
   >
   implements IStateChangeSubscriptionManager
{
   constructor(
      private readonly _objectObserverManager: IObjectPropertyObserverProxyPairManager,
      private readonly _errorLog: IErrorLog,
      private readonly _guidFactory: IGuidFactory,
   ) {
      super();
   }

   public getId(context: unknown): unknown {
      return context;
   }

   public isRegistered(context: unknown, key: unknown): boolean {
      const stateChangeSubscriptionsForContextManager = this.getFromId(context);
      if (!stateChangeSubscriptionsForContextManager) {
         return false;
      }

      return stateChangeSubscriptionsForContextManager.isGroupRegistered(key);
   }

   protected createId(context: unknown): unknown {
      return context;
   }

   protected override createInstance(
      context: unknown,
      id: unknown
   ): IStateChangeSubscriptionsForContextManager {
      return new StateChangeSubscriptionsForContextManager(
         context,
         () => this.release(id),
         this._objectObserverManager,
         this._errorLog,
         this._guidFactory
      );
   }

   protected override releaseInstance(
      instance: IStateChangeSubscriptionsForContextManager,
      id: unknown
   ): void {
      super.releaseInstance(instance, id);
      instance.dispose();
   }
}
