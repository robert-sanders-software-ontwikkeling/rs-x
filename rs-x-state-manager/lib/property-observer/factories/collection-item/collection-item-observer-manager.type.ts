import { type ISingletonFactory } from '@rs-x/core';

import { type IObserver } from '../../../observer.interface';
import {
  type IIndexObserverIdInfo,
  type IIndexObserverInfo,
} from '../index-observer-info.interface';

export type Collection = Map<unknown, unknown> | Array<unknown> | Set<unknown>;

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
