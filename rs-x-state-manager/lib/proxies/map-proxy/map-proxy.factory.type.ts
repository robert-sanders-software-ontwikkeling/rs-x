import { type IDisposableOwner, type ISingletonFactory } from '@rs-x/core';

import {
   type IObserverProxyPair
} from '../../object-property-observer-proxy-pair-manager.type';

export interface IMapProxifyIdData {
   map: Map<unknown, unknown>;
}

export interface IMapProxifyData extends IMapProxifyIdData {
   owner?: IDisposableOwner;
}

export type IMapObserverProxyPair = IObserverProxyPair<
   Map<unknown, unknown>
>;
export type IMapProxyFactory = ISingletonFactory<
   Map<unknown, unknown>,
   IMapProxifyData,
   IMapObserverProxyPair
>;
