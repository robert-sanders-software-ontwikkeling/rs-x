import { type IDisposableOwner, type ISingletonFactory } from '@rs-x/core';

import {
   type IObserverProxyPair,
   type ShouldWatchIndex
} from '../../object-property-observer-proxy-pair-manager.type';

export interface IDateProxyIdData {
   date: Date
   shouldWatchIndex?: ShouldWatchIndex;
}

export interface IDateProxyData extends IDateProxyIdData {
   owner?: IDisposableOwner;
}

export type IDateObserverProxyPair = IObserverProxyPair<Date>;
export type IDateProxyFactory = ISingletonFactory<
   string,
   IDateProxyData,
   IDateObserverProxyPair
>;
