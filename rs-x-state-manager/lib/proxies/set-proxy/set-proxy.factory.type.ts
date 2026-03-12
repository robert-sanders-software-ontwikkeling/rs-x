import { type IDisposableOwner, type IKeyedInstanceFactory } from '@rs-x/core';

import { type IObserverProxyPair } from '../../object-property-observer-proxy-pair-manager.type';

export interface ISetProxifyIdData {
  set: Set<unknown>;
}
export interface ISetProxifyData extends ISetProxifyIdData {
  owner?: IDisposableOwner;
}

export type ISetObserverProxyPair = IObserverProxyPair<Set<unknown>>;
export type ISetProxyFactory = IKeyedInstanceFactory<
  Set<unknown>,
  ISetProxifyData,
  ISetObserverProxyPair,
  ISetProxifyIdData
>;
