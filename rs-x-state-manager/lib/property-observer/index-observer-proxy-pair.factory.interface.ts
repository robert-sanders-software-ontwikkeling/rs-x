import { IDisposable } from '@rs-x/core';
import {
   IObserverProxyPair,
   IPropertyInfo,
} from '../object-property-observer-proxy-pair-manager.type';
import { IDisposableOwner } from '../disposable-owner.interface';

export interface IIndexObserverProxyPairFactory<
   TProxy = unknown,
   TId = unknown,
> extends IDisposable {
   create(
      owner: IDisposableOwner,
      object: unknown,
      data: IPropertyInfo
   ): IObserverProxyPair<TProxy, TId>;
   applies(object: unknown, propertyInfo: IPropertyInfo): boolean;
}
