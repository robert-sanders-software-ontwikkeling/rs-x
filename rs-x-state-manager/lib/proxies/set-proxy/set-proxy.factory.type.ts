import { ISingletonFactory } from '@rs-x-core';
import {
   IObserverProxyPair,
   MustProxify,
} from '../../object-property-observer-proxy-pair-manager.type';
import { ProcessSetItem } from './process-set-item.type';

export interface ISetProxifyIdData {
   set: Set<unknown>;
   mustProxify?: MustProxify;
}
export interface ISetProxifyData extends ISetProxifyIdData {
   proxifyItem?: ProcessSetItem;
   unproxifyItem?: ProcessSetItem;
}

export type ISetObserverProxyPair = IObserverProxyPair<Set<unknown>, string>;
export type ISetProxyFactory = ISingletonFactory<
   string,
   ISetProxifyData,
   ISetObserverProxyPair,
   ISetProxifyIdData
>;
