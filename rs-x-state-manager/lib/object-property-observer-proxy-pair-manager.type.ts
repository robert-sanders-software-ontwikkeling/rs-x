import { ISingletonFactory } from '@rs-x/core';
import { IDisposableOwner } from './disposable-owner.interface';
import { IObserver } from './observer.interface';

export interface IObserverProxyPair<TProxy = unknown, TId = unknown> {
   observer: IObserver;
   proxy?: TProxy;
   proxyTarget: TProxy;
   id: TId;
}

export type MustProxify = (index: unknown, target?: unknown) => boolean;

export interface IPropertyIdInfo {
   key: unknown;
   mustProxify?: MustProxify;
}

export interface IPropertyInfo extends IPropertyIdInfo {
   value?: unknown;
   owner?: IDisposableOwner;
   setValue?: (value: unknown) => boolean;
   initializeManually?: boolean;
}

export type IPropertyObserverProxyPairManager = ISingletonFactory<
   unknown,
   IPropertyInfo,
   IObserverProxyPair,
   IPropertyIdInfo
>;

export type IObjectPropertyObserverProxyPairManager = ISingletonFactory<
   unknown,
   unknown,
   IPropertyObserverProxyPairManager
>;
