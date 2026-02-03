import {
  type IGuidFactory,
  Inject,
  Injectable,
  MultiInject,
  RsXCoreInjectionTokens,
  SingletonFactory,
  SingletonFactoryWithGuid,
  Type,
  UnsupportedException,
} from '@rs-x/core';

import type { IIndexWatchRule } from './index-watch-rule-registry/index-watch-rule.interface';
import type { IIndexObserverProxyPairFactory } from './property-observer/index-observer-proxy-pair.factory.interface';
import type {
  IIndexInfo,
  IObjectPropertyObserverProxyPairManager,
  IObserverProxyPair,
  IPropertyInfo,
  IPropertyObserverProxyPairManager,
} from './object-property-observer-proxy-pair-manager.type';
import { RsXStateManagerInjectionTokens } from './rs-x-state-manager-injection-tokens';

class PropertyObserverProxyPairManager
  extends SingletonFactoryWithGuid<
    IPropertyInfo,
    IObserverProxyPair,
    IIndexInfo
  >
  implements IPropertyObserverProxyPairManager
{
  constructor(
    guidFactory: IGuidFactory,
    private readonly _object: unknown,
    private readonly _observerFactories: readonly IIndexObserverProxyPairFactory[],
    private readonly releaseContext: () => void,
  ) {
    super(guidFactory);
  }

  protected getGroupId(data: IPropertyInfo): unknown {
    return data.index;
  }

  protected getGroupMemberId(data: IPropertyInfo): IIndexWatchRule | undefined {
    return data.indexWatchRule;
  }

  protected createInstance(
    propertyInfo: IPropertyInfo,
    id: string,
  ): IObserverProxyPair {
    return this.getObserverFactory(propertyInfo).create(
      {
        canDispose: () => this.getReferenceCount(id) === 1,
        release: () => {
          propertyInfo.owner?.release();
          this.release(id);
        },
      },
      this._object,
      propertyInfo,
    );
  }

  protected override releaseInstance(
    observerProxyPair: IObserverProxyPair,
  ): void {
    observerProxyPair.observer.dispose();
  }

  protected override onReleased(): void {
    this.releaseContext();
  }

  private getObserverFactory(
    propertyInfo: IPropertyInfo,
  ): IIndexObserverProxyPairFactory {
    const observerFactory = this._observerFactories.find((observerFactory) =>
      observerFactory.applies(this._object, propertyInfo),
    );

    if (!observerFactory) {
      throw new UnsupportedException(
        `No observer factory found for given object of type ${Type.getConstructorName(this._object)} for given id ${propertyInfo.index}`,
      );
    }

    return observerFactory;
  }
}

@Injectable()
export class ObjectPropertyObserverProxyPairManager
  extends SingletonFactory<unknown, unknown, IPropertyObserverProxyPairManager>
  implements IObjectPropertyObserverProxyPairManager
{
  constructor(
    @MultiInject(
      RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList,
    )
    private readonly _factories: IIndexObserverProxyPairFactory[],
    @Inject(RsXCoreInjectionTokens.IGuidFactory)
    private readonly _guidFactory: IGuidFactory,
  ) {
    super();
  }

  public getId(context: unknown): unknown {
    return context;
  }

  protected createId(context: unknown): unknown {
    return context;
  }

  protected createInstance(
    context: unknown,
  ): IPropertyObserverProxyPairManager {
    return new PropertyObserverProxyPairManager(
      this._guidFactory,
      context,
      this._factories,
      () => this.release(context),
    );
  }
}
