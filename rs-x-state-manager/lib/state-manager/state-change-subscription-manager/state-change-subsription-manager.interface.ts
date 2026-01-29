import { type Subscription } from 'rxjs';

import {
   type IPropertyChange,
   type ISingletonFactory,
   type ISingletonFactoryWithIdGeneration,
} from '@rs-x/core';

import { type MustProxify } from '../../object-property-observer-proxy-pair-manager.type';
import { type IObserver } from '../../observer.interface';

export interface IStateChangeObserverInfo {
   readonly observer: IObserver;
   readonly subscription: Subscription;
}

export interface IStateChangeSubscriptionIdInfo {
   key: unknown;
   mustProxify?: MustProxify;
}
export interface IStateChangeSubscriptionInfo
   extends IStateChangeSubscriptionIdInfo {
   onChanged: (change: IPropertyChange) => void;
   init?: (observer: IObserver) => void;
}

export type IStateChangeSubscriptionsForContextManager =
   ISingletonFactoryWithIdGeneration<
      string,
      IStateChangeSubscriptionInfo,
      IObserver,
      IStateChangeSubscriptionIdInfo
   >;
export interface IStateChangeSubscriptionManager
   extends ISingletonFactory<
      unknown,
      unknown,
      IStateChangeSubscriptionsForContextManager
   > {
   isRegistered(context: unknown, key: unknown): boolean;
}
