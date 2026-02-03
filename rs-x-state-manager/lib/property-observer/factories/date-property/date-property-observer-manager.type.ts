import { type DateProperty, type ISingletonFactory } from '@rs-x/core';

import { type IObserver } from '../../../observer.interface';
import {
  type IIndexObserverIdInfo,
  type IIndexObserverInfo,
} from '../index-observer-info.interface';

export type IDatePropertyObserverIdInfo = IIndexObserverIdInfo<DateProperty>;
export type IDatePropertyObserverInfo = IIndexObserverInfo<DateProperty>;
export type IProperForDataObserverManager = ISingletonFactory<
  DateProperty,
  IDatePropertyObserverInfo,
  IObserver
>;
export type IDatePropertyObserverManager = ISingletonFactory<
  Date,
  Date,
  IProperForDataObserverManager
>;
