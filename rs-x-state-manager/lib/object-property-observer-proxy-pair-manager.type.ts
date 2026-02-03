import { type IDisposableOwner, type ISingletonFactory } from '@rs-x/core';

import type { IIndexWatchRule } from './index-watch-rule-registry/index-watch-rule.interface';
import { type IObserver } from './observer.interface';

export interface IObserverProxyPair<TProxy = unknown> {
  observer: IObserver;
  proxy?: TProxy;
  proxyTarget?: TProxy;
}

export interface IIndexInfo {
  index: unknown;
  indexWatchRule?: IIndexWatchRule;
}

export interface IPropertyInfo extends IIndexInfo {
  value?: unknown;
  owner?: IDisposableOwner;
  setValue?: (value: unknown) => boolean;
  initializeManually?: boolean;
}

export type IPropertyObserverProxyPairManager = ISingletonFactory<
  unknown,
  IPropertyInfo,
  IObserverProxyPair,
  IIndexInfo
>;

export type IObjectPropertyObserverProxyPairManager = ISingletonFactory<
  unknown,
  unknown,
  IPropertyObserverProxyPairManager
>;
