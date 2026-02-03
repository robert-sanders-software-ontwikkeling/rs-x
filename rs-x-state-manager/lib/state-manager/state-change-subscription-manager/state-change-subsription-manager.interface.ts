import { type Subscription } from 'rxjs';

import {
  type IInstanceGroupInfo,
  type IPropertyChange,
  type ISingletonFactory,
  type ISingletonFactoryWithIdGeneration,
} from '@rs-x/core';

import type { IIndexWatchRule } from '../../index-watch-rule-registry/index-watch-rule.interface';
import { type IObserver } from '../../observer.interface';

export interface IStateChangeObserverInfo {
  readonly observer: IObserver;
  readonly subscription: Subscription;
}

export interface IStateChangeSubscriptionIdInfo {
  index: unknown;
  indexWatchRule?: IIndexWatchRule;
}
export interface IStateChangeSubscriptionInfo extends IStateChangeSubscriptionIdInfo {
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
export interface IStateChangeSubscriptionManager extends ISingletonFactory<
  unknown,
  unknown,
  IStateChangeSubscriptionsForContextManager
> {
  isRegistered(context: unknown, key: unknown): boolean;
  instanceGroupInfoEntriesForContext(
    context: unknown,
  ): IterableIterator<IInstanceGroupInfo<string, IObserver>>;
}
