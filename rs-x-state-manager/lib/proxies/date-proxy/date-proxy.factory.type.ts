import { ISingletonFactory } from '@rs-x/core';
import { IDisposableOwner } from '../../disposable-owner.interface';
import {
   IObserverProxyPair,
   MustProxify
} from '../../object-property-observer-proxy-pair-manager.type';

export interface IDateProxyIdData {
   date: Date
   mustProxify?: MustProxify;
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
