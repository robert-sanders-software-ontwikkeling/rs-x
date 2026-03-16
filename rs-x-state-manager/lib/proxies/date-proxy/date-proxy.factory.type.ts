import { type IDisposableOwner, type IKeyedInstanceFactory } from '@rs-x/core';

import type { IIndexWatchRule } from '../../index-watch-rule-registry/index-watch-rule.interface';
import { type IObserverProxyPair } from '../../object-property-observer-proxy-pair-manager.type';

export interface IDateProxyIdData {
  date: Date;
  indexWatchRule?: IIndexWatchRule;
}

export interface IDateProxyData extends IDateProxyIdData {
  owner?: IDisposableOwner;
}

export type IDateObserverProxyPair = IObserverProxyPair<Date>;
export type IDateProxyFactory = IKeyedInstanceFactory<
  string,
  IDateProxyData,
  IDateObserverProxyPair
>;
