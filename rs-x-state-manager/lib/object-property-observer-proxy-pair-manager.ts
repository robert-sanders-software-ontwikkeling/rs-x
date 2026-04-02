import {
  GroupedKeyedInstanceFactory,
  Injectable,
  KeyedInstanceFactory,
  MultiInject,
  Type,
  UnsupportedException,
} from '@rs-x/core';

import { IIndexWatchRule } from './index-watch-rule/index-watch-rule.interface';
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
  extends GroupedKeyedInstanceFactory<
    number,
    IPropertyInfo,
    IObserverProxyPair,
    IIndexInfo
  >
  implements IPropertyObserverProxyPairManager
{
  private _nextId = 0;
  constructor(
    private readonly _object: unknown,
    private readonly _observerFactories: readonly IIndexObserverProxyPairFactory[],
    private readonly releaseContext: () => void,
  ) {
    super();
  }

  protected getGroupId(data: IPropertyInfo): unknown {
    return data.index;
  }

  protected getGroupMemberId(data: IPropertyInfo): IIndexWatchRule | undefined {
    return data.indexWatchRule;
  }

  protected createInstance(
    propertyInfo: IPropertyInfo,
    id: number,
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

  protected override createUniqueId(_data: IPropertyInfo): number {
    return this._nextId++;
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
  extends KeyedInstanceFactory<
    unknown,
    unknown,
    IPropertyObserverProxyPairManager
  >
  implements IObjectPropertyObserverProxyPairManager
{
  constructor(
    @MultiInject(
      RsXStateManagerInjectionTokens.IPropertyObserverProxyPairFactoryList,
    )
    private readonly _factories: IIndexObserverProxyPairFactory[],
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
    return new PropertyObserverProxyPairManager(context, this._factories, () =>
      this.release(context),
    );
  }
}
