import { type IDisposableOwner, type IKeyedInstanceFactory } from '@rs-x/core';

import { type IObserverProxyPair } from '../../object-property-observer-proxy-pair-manager.type';

export interface IPromiseProxyData {
  owner?: IDisposableOwner;
  promise: Promise<unknown>;
}

export type IPromiseObserverProxyPair = IObserverProxyPair<Promise<unknown>>;
export type IPromiseProxyFactory = IKeyedInstanceFactory<
  Promise<unknown>,
  IPromiseProxyData,
  IPromiseObserverProxyPair
>;
