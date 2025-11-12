import { ISingletonFactory } from '@rs-x-core';
import { MustProxify } from '../../../object-property-observer-proxy-pair-manager.type';
import { IObserver } from '../../../observer.interface';
import {
   IIndexObserverIdInfo,
   IIndexObserverInfo,
} from '../index-observer-info.interface';

export type IMapKeyObserverIdInfo = IIndexObserverIdInfo<unknown>;
export type IMapKeyObserverInfo = IIndexObserverInfo<unknown>;
export type IMapKeyObserverManager = ISingletonFactory<
   MustProxify | unknown,
   IMapKeyObserverInfo,
   IObserver
>;
export type IMapItemObserverManager = ISingletonFactory<
   Map<unknown, unknown>,
   Map<unknown, unknown>,
   IMapKeyObserverManager
>;
