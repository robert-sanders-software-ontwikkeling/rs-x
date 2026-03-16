import { type DateProperty, type IKeyedInstanceFactory } from '@rs-x/core';

import { type IObserver } from '../../../observer.interface';
import {
  type IIndexObserverIdInfo,
  type IIndexObserverInfo,
} from '../index-observer-info.interface';

export type IDatePropertyObserverIdInfo = IIndexObserverIdInfo<DateProperty>;
export type IDatePropertyObserverInfo = IIndexObserverInfo<DateProperty>;
export type IProperForDataObserverManager = IKeyedInstanceFactory<
  DateProperty,
  IDatePropertyObserverInfo,
  IObserver
>;
export type IDatePropertyObserverManager = IKeyedInstanceFactory<
  Date,
  Date,
  IProperForDataObserverManager
>;
