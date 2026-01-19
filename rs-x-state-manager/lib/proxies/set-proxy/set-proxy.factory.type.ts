import { IDisposableOwner, ISingletonFactory } from '@rs-x/core';
import {
   IObserverProxyPair
} from '../../object-property-observer-proxy-pair-manager.type';

export interface ISetProxifyIdData {
   set: Set<unknown>;

}
export interface ISetProxifyData extends ISetProxifyIdData {
   owner?: IDisposableOwner;
}

export type ISetObserverProxyPair = IObserverProxyPair<Set<unknown>>;
export type ISetProxyFactory = ISingletonFactory<
   Set<unknown>,
   ISetProxifyData,
   ISetObserverProxyPair,
   ISetProxifyIdData
>;
