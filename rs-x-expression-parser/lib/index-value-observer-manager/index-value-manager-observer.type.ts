import { ISingletonFactory } from '@rs-x/core';
import { IIndexValueObserver } from './index-value-observer.interface';
import { MustProxify } from '@rs-x/state-manager';

export interface IIndexInfo {
   context: unknown;
   index: unknown;
}

export interface IIndexForContextInfo {
   index: unknown;
   mustProxify?: MustProxify;
}

export type IIndexValueObserversForContextManager = ISingletonFactory<
   unknown,
   IIndexForContextInfo,
   IIndexValueObserver
>;
export type IIndexValueObserverManager = ISingletonFactory<
   unknown,
   IIndexInfo,
   IIndexValueObserversForContextManager
>;
