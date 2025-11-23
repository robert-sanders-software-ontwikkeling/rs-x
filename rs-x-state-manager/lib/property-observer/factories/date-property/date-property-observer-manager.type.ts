import { DateProperty, ISingletonFactory } from '@rs-x/core';
import { IObserver } from '../../../observer.interface';
import {
   IIndexObserverIdInfo,
   IIndexObserverInfo,
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
