import { IDisposableOwner } from '../disposable-owner.interface';
import { IObserverProxyPair } from '../object-property-observer-proxy-pair-manager.type';
import { IProxyTarget } from './object-observer-proxy-pair-manager.type';

export interface IObjectObserverProxyPairFactory<
   TTarget = unknown,
   TId = unknown,
> {
   create(
      owner: IDisposableOwner,
      proxyTarget: IProxyTarget<TTarget>
   ): IObserverProxyPair<TTarget, TId>;
   applies(object: unknown): boolean;
}
