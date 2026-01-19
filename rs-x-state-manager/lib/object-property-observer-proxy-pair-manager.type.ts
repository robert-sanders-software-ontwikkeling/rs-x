import { IDisposableOwner, ISingletonFactory } from '@rs-x/core';
import { IObserver } from './observer.interface';

export interface IObserverProxyPair<TProxy = unknown> {
   observer: IObserver;
   proxy?: TProxy;
   proxyTarget?: TProxy;
}

export type MustProxify = (index: unknown, target?: unknown) => boolean;

export interface IPropertyIdInfo {
   key: unknown;
   mustProxify?: MustProxify
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
