import { ISingletonFactory } from '@rs-x-core';
import { IObserver } from '../../../observer.interface';
import {
   IIndexObserverIdInfo,
   IIndexObserverInfo,
} from '../index-observer-info.interface';

export type IPropertyObserverIdInfo = IIndexObserverIdInfo<string>;

export type IPropertyObserverInfo = IIndexObserverInfo<string>;
export type IPropertyObserverManager = ISingletonFactory<
   string,
   IPropertyObserverInfo,
   IObserver
>;
export type IObjectPropertyObserverManager = ISingletonFactory<
   object,
   object,
   IPropertyObserverManager
>;
