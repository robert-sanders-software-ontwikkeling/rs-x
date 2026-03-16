import { type IDisposableOwner, type IKeyedInstanceFactory } from '@rs-x/core';

import { type IObserverProxyPair } from '../../object-property-observer-proxy-pair-manager.type';

export interface IArrayProxyIdData {
  array: unknown[];
}

export interface IArrayProxyData extends IArrayProxyIdData {
  owner?: IDisposableOwner;
}

export type IArrayObserverProxyPair = IObserverProxyPair<unknown[]>;
export type IArrayProxyFactory = IKeyedInstanceFactory<
  unknown,
  IArrayProxyData,
  IArrayObserverProxyPair,
  IArrayProxyIdData
>;
