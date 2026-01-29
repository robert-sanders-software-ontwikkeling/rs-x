import { type IDisposable, type IDisposableOwner } from '@rs-x/core';

import {
   type IObserverProxyPair,
   type IPropertyInfo,
} from '../object-property-observer-proxy-pair-manager.type';

export interface IIndexObserverProxyPairFactory<TProxy = unknown> extends IDisposable {
   create(
      owner: IDisposableOwner,
      object: unknown,
      data: IPropertyInfo
   ): IObserverProxyPair<TProxy>;
   applies(object: unknown, propertyInfo: IPropertyInfo): boolean;
}
