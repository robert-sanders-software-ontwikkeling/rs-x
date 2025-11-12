import { ISingletonFactory } from '@rs-x-core';
import { IDisposableOwner } from '../../disposable-owner.interface';
import {
   IObserverProxyPair,
   MustProxify,
} from '../../object-property-observer-proxy-pair-manager.type';
import { ProcessMapItem } from './process-map-item.type';

export interface IMapProxifyIdData {
   mustProxify?: MustProxify;
   map: Map<unknown, unknown>;
}

export interface IMapProxifyData extends IMapProxifyIdData {
   owner?: IDisposableOwner;
   proxifyItem?: ProcessMapItem;
   unproxifyItem?: ProcessMapItem;
   mustProxify?: MustProxify;
}

export type IMapObserverProxyPair = IObserverProxyPair<
   Map<unknown, unknown>,
   string
>;
export type IMapProxyFactory = ISingletonFactory<
   string,
   IMapProxifyData,
   IMapObserverProxyPair,
   IMapProxifyIdData
>;
