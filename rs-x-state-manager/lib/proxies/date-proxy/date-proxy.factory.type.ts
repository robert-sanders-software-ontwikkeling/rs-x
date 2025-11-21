import { ISingletonFactory } from '@rs-x/core';
import { IDisposableOwner } from '../../disposable-owner.interface';
import {
   IObserverProxyPair
} from '../../object-property-observer-proxy-pair-manager.type';

export interface IDateIdData {
   date: Date
}

export interface IDateProxyData extends IDateIdData {
   owner?: IDisposableOwner;
}

export type IDateObserverProxyPair = IObserverProxyPair<Date, Date>;
export type IDateProxyFactory = ISingletonFactory<
   Date,
   IDateProxyData,
   IDateObserverProxyPair
>;
