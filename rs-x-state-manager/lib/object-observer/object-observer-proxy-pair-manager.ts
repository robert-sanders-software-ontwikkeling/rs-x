import {
  GuidKeyedInstanceFactory,
  type IGuidFactory,
  Inject,
  Injectable,
  InvalidOperationException,
  type IProxyRegistry,
  RsXCoreInjectionTokens,
  Type,
} from '@rs-x/core';

import type { IIndexWatchRule } from '../index-watch-rule-registry/index-watch-rule.interface';
import type { IObserverProxyPair } from '../object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from '../rs-x-state-manager-injection-tokens';

import type { IObjectObserverProxyPairFactoryProvider } from './object-observer-proxy-pair-factory.provider.interface';
import type {
  IObjectObserverProxyPairManager,
  IProxyTarget,
} from './object-observer-proxy-pair-manager.type';

@Injectable()
export class ObjectObserverProxyPairManager
  extends GuidKeyedInstanceFactory<IProxyTarget<unknown>, IObserverProxyPair>
  implements IObjectObserverProxyPairManager
{
  constructor(
    @Inject(
      RsXStateManagerInjectionTokens.IObjectObserverProxyPairFactoryProviderFactory,
    )
    private readonly getObserverFactoryProvider: () => IObjectObserverProxyPairFactoryProvider,
    @Inject(RsXCoreInjectionTokens.IProxyRegistry)
    private readonly _proxyRegistry: IProxyRegistry,
    @Inject(RsXCoreInjectionTokens.IGuidFactory)
    guidFactory: IGuidFactory,
  ) {
    super(guidFactory);
  }

  protected override getGroupId(data: IProxyTarget<unknown>): unknown {
    return data.target;
  }

  protected override getGroupMemberId(
    data: IProxyTarget<unknown>,
  ): IIndexWatchRule | undefined {
    return data.indexWatchRule;
  }

  public override create(data: IProxyTarget<unknown>): {
    referenceCount: number;
    instance: IObserverProxyPair<unknown>;
    id: string;
  } {
    if (this._proxyRegistry.isProxy(data.target)) {
      throw new InvalidOperationException('Cannot create a proxy for a proxy');
    }

    return super.create(data);
  }

  protected createInstance(
    objectObserverInfo: IProxyTarget<unknown>,
    id: string,
  ): IObserverProxyPair {
    const factory = this.getObserverFactoryProvider().factories.find(
      (factory) => factory.applies(objectObserverInfo.target),
    );
    return factory
      ? factory.create(
          {
            canDispose: () => this.getReferenceCount(id) === 1,
            release: () => this.release(id),
          },
          objectObserverInfo,
        )
      : Type.cast(null);
  }

  protected override releaseInstance(
    observerProxyPair: IObserverProxyPair,
  ): void {
    observerProxyPair.observer.dispose();
  }
}
