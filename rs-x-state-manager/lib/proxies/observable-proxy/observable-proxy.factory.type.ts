import { type Observable } from 'rxjs';

import { type IDisposableOwner, type ISingletonFactory } from '@rs-x/core';

import { type IObserverProxyPair } from '../../object-property-observer-proxy-pair-manager.type';

export interface IObservableProxyData {
   owner?: IDisposableOwner;
   observable: Observable<unknown>;
}

export type IObservableObserverProxyPair = IObserverProxyPair<Observable<unknown>>;
export type IObservableProxyFactory = ISingletonFactory<
   Observable<unknown>,
   IObservableProxyData,
   IObservableObserverProxyPair
>;
