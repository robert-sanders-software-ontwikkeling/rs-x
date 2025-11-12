import { ISingletonFactory } from '@rs-x-core';
import { MustProxify } from '../../../object-property-observer-proxy-pair-manager.type';
import { IObserver } from '../../../observer.interface';
import { IIndexObserverInfo } from '../index-observer-info.interface';

export type IArrayIndexObserverInfo = IIndexObserverInfo<number>;
export type IArrayIndexObserverManager = ISingletonFactory<
   MustProxify | number,
   IArrayIndexObserverInfo,
   IObserver
>;
export type IArrayItemObserverManager = ISingletonFactory<
   unknown[],
   unknown[],
   IArrayIndexObserverManager
>;
