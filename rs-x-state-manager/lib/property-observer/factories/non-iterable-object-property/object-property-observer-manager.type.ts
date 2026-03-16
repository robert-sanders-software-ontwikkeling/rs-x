import { type IKeyedInstanceFactory } from '@rs-x/core';

import { type IObserver } from '../../../observer.interface';
import {
  type IIndexObserverIdInfo,
  type IIndexObserverInfo,
} from '../index-observer-info.interface';

export type IPropertyObserverIdInfo = IIndexObserverIdInfo<string>;

export type IPropertyObserverInfo = IIndexObserverInfo<string>;
export type IPropertyObserverManager = IKeyedInstanceFactory<
  string,
  IPropertyObserverInfo,
  IObserver
>;
export type IObjectPropertyObserverManager = IKeyedInstanceFactory<
  object,
  object,
  IPropertyObserverManager
>;
