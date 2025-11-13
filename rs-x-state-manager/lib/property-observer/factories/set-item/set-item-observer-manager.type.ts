import { ISingletonFactory } from '@rs-x/core';
import { MustProxify } from '../../../object-property-observer-proxy-pair-manager.type';
import { IObserver } from '../../../observer.interface';
import {
   IIndexObserverIdInfo,
   IIndexObserverInfo,
} from '../index-observer-info.interface';

export type ISetKeyObserverIdInfo = IIndexObserverIdInfo<unknown>;
export type ISetKeyObserverInfo = IIndexObserverInfo<unknown>;
export type ISetKeyObserverManager = ISingletonFactory<
   MustProxify,
   ISetKeyObserverInfo,
   IObserver
>;
export type ISetItemObserverManager = ISingletonFactory<
   Set<unknown>,
   Set<unknown>,
   ISetKeyObserverManager
>;
