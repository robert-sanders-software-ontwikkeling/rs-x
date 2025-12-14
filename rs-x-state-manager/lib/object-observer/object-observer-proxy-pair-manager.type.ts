import { ISingletonFactory } from '@rs-x/core';
import {
   IObserverProxyPair,
   MustProxify,
} from '../object-property-observer-proxy-pair-manager.type';

export interface IProxyTarget<TTarget> {
   initializeManually?: boolean;
   target: TTarget;
   mustProxify?: MustProxify;
}

export type IObjectObserverProxyPairManager<TTarget = unknown> = ISingletonFactory<
   unknown,
   IProxyTarget<TTarget>,
   IObserverProxyPair<TTarget>
>;
