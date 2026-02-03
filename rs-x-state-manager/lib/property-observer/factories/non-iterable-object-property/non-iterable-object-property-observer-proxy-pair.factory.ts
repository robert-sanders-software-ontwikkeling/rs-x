import {
  type IErrorLog,
  type IGuidFactory,
  type IIndexValueAccessor,
  Inject,
  Injectable,
  type IValueMetadata,
  RsXCoreInjectionTokens,
  Type,
} from '@rs-x/core';

import type { IObjectObserverProxyPairManager } from '../../../object-observer/object-observer-proxy-pair-manager.type';
import type { IPropertyInfo } from '../../../object-property-observer-proxy-pair-manager.type';
import type { IProxyRegistry } from '../../../proxies/proxy-registry/proxy-registry.interface';
import { RsXStateManagerInjectionTokens } from '../../../rs-x-state-manager-injection-tokens';
import { IndexObserverProxyPairFactory } from '../indexed-value-observer-proxy-pair/indexed-value-observer-proxy-pair.factory';

import type { IObjectPropertyObserverManager } from './object-property-observer-manager.type';

@Injectable()
export class NonIterableObjectPropertyObserverProxyPairFactory extends IndexObserverProxyPairFactory<
  object,
  string
> {
  constructor(
    @Inject(RsXStateManagerInjectionTokens.IObjectObserverProxyPairManager)
    objectObserveryManager: IObjectObserverProxyPairManager,
    @Inject(RsXStateManagerInjectionTokens.IObjectPropertyObserverManager)
    objectPropertyObserverManager: IObjectPropertyObserverManager,
    @Inject(RsXCoreInjectionTokens.IErrorLog)
    errorLog: IErrorLog,
    @Inject(RsXCoreInjectionTokens.IGuidFactory)
    guidFactory: IGuidFactory,
    @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
    indexValueAccessor: IIndexValueAccessor,
    @Inject(RsXStateManagerInjectionTokens.IProxyRegistry)
    proxyRegister: IProxyRegistry,
    @Inject(RsXCoreInjectionTokens.IValueMetadata)
    valueMetadata: IValueMetadata,
  ) {
    super(
      objectObserveryManager,
      objectPropertyObserverManager,
      errorLog,
      guidFactory,
      indexValueAccessor,
      proxyRegister,
      valueMetadata,
    );
  }

  public applies(object: unknown, propertyInfo: IPropertyInfo): boolean {
    return (
      !(
        Array.isArray(object) ||
        object instanceof Date ||
        object instanceof Map ||
        object instanceof Set
      ) &&
      Type.isString(propertyInfo.index) &&
      !Type.isMethod((Type.toObject(object) ?? {})[propertyInfo.index])
    );
  }

  protected setIndexValue(
    object: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    object[key] = value;
  }
}
