import { ISingletonFactory } from '@rs-x/core';
import { IObserver } from '../../../observer.interface';
import {
   IIndexObserverIdInfo,
   IIndexObserverInfo
} from '../index-observer-info.interface';

export type Collection = Map<unknown, unknown>| Array<unknown> | Set<unknown>



export type ICollectionIdexObserverIdInfo = IIndexObserverIdInfo<unknown>;
export type ICollectionIndexObserverManager = ISingletonFactory<
   unknown,
   IIndexObserverInfo,
   IObserver
>;
export type ICollectionItemObserverManager = ISingletonFactory<
   Collection,
   Collection,
   ICollectionIndexObserverManager
>;
