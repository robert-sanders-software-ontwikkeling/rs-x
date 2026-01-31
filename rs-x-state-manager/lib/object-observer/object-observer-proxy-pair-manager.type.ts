import { type ISingletonFactory } from '@rs-x/core';

import {
  type IObserverProxyPair,
  type ShouldWatchIndex,
} from '../object-property-observer-proxy-pair-manager.type';

export interface IProxyTarget<TTarget> {
  initializeManually?: boolean;
  target: TTarget;
  shouldWatchIndex?: ShouldWatchIndex;
}

export type IObjectObserverProxyPairManager<TTarget = unknown> =
  ISingletonFactory<
    unknown,
    IProxyTarget<TTarget>,
    IObserverProxyPair<TTarget>
  >;
