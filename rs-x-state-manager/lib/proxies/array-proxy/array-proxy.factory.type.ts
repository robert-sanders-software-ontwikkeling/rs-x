import { ISingletonFactory } from '@rs-x/core';
import { IDisposableOwner } from '../../disposable-owner.interface';
import {
   IObserverProxyPair,
   MustProxify,
} from '../../object-property-observer-proxy-pair-manager.type';
import { ProcessArrayItem } from './process-array-item.type';

export interface IArrayProxyIdData {
   mustProxify?: MustProxify;
   array: unknown[];
}

export interface IArrayProxyData extends IArrayProxyIdData {
   owner?: IDisposableOwner;
   proxifyItem?: ProcessArrayItem;
   unproxifyItem?: ProcessArrayItem;
}

export type IArrayObserverProxyPair = IObserverProxyPair<unknown[], string>;
export type IArrayProxyFactory = ISingletonFactory<
   string,
   IArrayProxyData,
   IArrayObserverProxyPair,
   IArrayProxyIdData
>;
