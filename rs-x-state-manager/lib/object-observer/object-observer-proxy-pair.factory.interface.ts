import { type IDisposableOwner } from '@rs-x/core';

import { type IObserverProxyPair } from '../object-property-observer-proxy-pair-manager.type';

import { type IProxyTarget } from './object-observer-proxy-pair-manager.type';

export interface IObjectObserverProxyPairFactory<TTarget = unknown> {
  readonly priority: number;
  create(
    owner: IDisposableOwner,
    proxyTarget: IProxyTarget<TTarget>,
  ): IObserverProxyPair<TTarget>;
  applies(object: unknown): boolean;
}
