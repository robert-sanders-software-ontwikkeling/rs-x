import { Injectable, MultiInject } from '@rs-x/core';

import { RsXStateManagerInjectionTokens } from '../rs-x-state-manager-injection-tokens';

import type { IObjectObserverProxyPairFactory } from './object-observer-proxy-pair.factory.interface';
import type { IObjectObserverProxyPairFactoryProvider } from './object-observer-proxy-pair-factory.provider.interface';

@Injectable()
export class ObjectObserverProxyPairFactoryProvider implements IObjectObserverProxyPairFactoryProvider {
  public readonly factories: readonly IObjectObserverProxyPairFactory[];

  constructor(
    @MultiInject(
      RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryList,
    )
    factories: readonly IObjectObserverProxyPairFactory[],
  ) {
    this.factories = [...factories].sort((a, b) => b.priority - a.priority);
  }
}
