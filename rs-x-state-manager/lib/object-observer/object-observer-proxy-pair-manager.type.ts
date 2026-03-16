import { type IKeyedInstanceFactory } from '@rs-x/core';

import type { IIndexWatchRule } from '../index-watch-rule-registry/index-watch-rule.interface';
import { type IObserverProxyPair } from '../object-property-observer-proxy-pair-manager.type';

export interface IProxyTarget<TTarget> {
  initializeManually?: boolean;
  target: TTarget;
  indexWatchRule?: IIndexWatchRule;
}

export type IObjectObserverProxyPairManager<TTarget = unknown> =
  IKeyedInstanceFactory<
    unknown,
    IProxyTarget<TTarget>,
    IObserverProxyPair<TTarget>
  >;
