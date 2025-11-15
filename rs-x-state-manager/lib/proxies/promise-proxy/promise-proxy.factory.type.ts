import { ISingletonFactory } from '@rs-x/core';
import { IDisposableOwner } from '../../disposable-owner.interface';
import { IObserverProxyPair } from '../../object-property-observer-proxy-pair-manager.type';

export interface IPromiseProxyData {
   owner?: IDisposableOwner;
   promise: Promise<unknown>;
}

export type IPromiseObserverProxyPair = IObserverProxyPair<
   Promise<unknown>,
   Promise<unknown>
>;
export type IPromiseProxyFactory = ISingletonFactory<
   Promise<unknown>,
   IPromiseProxyData,
   IPromiseObserverProxyPair
>;
