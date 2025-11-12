import { IErrorLog, SingletonFactory } from '@rs-x-core';
import { GroupedChangeSubscriptionsForContextManager } from '../../grouped-change-subscriptions-for-context-manager';
import {
   IObjectPropertyObserverProxyPairManager,
   MustProxify,
} from '../../object-property-observer-proxy-pair-manager.type';
import { IObserver } from '../../observer.interface';
import {
   IStateChangeSubscriptionIdInfo,
   IStateChangeSubscriptionInfo,
   IStateChangeSubscriptionManager,
   IStateChangeSubscriptionsForContextManager,
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
      errorLog: IErrorLog
   ) {
      super(context, releaseContext, errorLog);
   }

   protected getGroupId(data: IStateChangeSubscriptionIdInfo): unknown {
      return data.key;
   }

   protected getGroupMemberId(
      data: IStateChangeSubscriptionIdInfo
   ): MustProxify {
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
      private readonly _errorLog: IErrorLog
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
      context: unknown
   ): IStateChangeSubscriptionsForContextManager {
      return new StateChangeSubscriptionsForContextManager(
         context,
         () => this.release(context),
         this._objectObserverManager,
         this._errorLog
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
