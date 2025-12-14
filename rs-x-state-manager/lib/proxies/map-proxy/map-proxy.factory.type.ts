import { ISingletonFactory } from '@rs-x/core';
import { IDisposableOwner } from '../../disposable-owner.interface';
import {
   IObserverProxyPair
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
