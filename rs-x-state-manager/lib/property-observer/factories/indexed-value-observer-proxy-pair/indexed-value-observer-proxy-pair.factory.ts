import {
  type IDisposableOwner,
  type IErrorLog,
  type IGuidFactory,
  type IIndexValueAccessor,
  type IPropertyChange,
  type IValueMetadata,
  Type,
  UnexpectedException,
} from '@rs-x/core';

import type { IIndexWatchRule } from '../../../index-watch-rule-registry/index-watch-rule.interface';
import { type IObjectObserverProxyPairManager } from '../../../object-observer/object-observer-proxy-pair-manager.type';
import {
  type IObserverProxyPair,
  type IPropertyInfo,
} from '../../../object-property-observer-proxy-pair-manager.type';
import { type IObserver } from '../../../observer.interface';
import { type ObserverGroup } from '../../../observer-group';
import { type IProxyRegistry } from '../../../proxies/proxy-registry/proxy-registry.interface';
import { type IIndexObserverProxyPairFactory } from '../../index-observer-proxy-pair.factory.interface';

import {
  type IIndexSetObserverManager,
  IndexChangeSubscriptionManager,
} from './index-change-subscription-manager';

export abstract class IndexObserverProxyPairFactory<
  TContext,
  TIndex,
> implements IIndexObserverProxyPairFactory<TContext> {
  private readonly _indexChangeSubscriptionManager: IndexChangeSubscriptionManager<TIndex>;

  protected constructor(
    private readonly _objectObserveryManager: IObjectObserverProxyPairManager,
    indexSetObserverManager: IIndexSetObserverManager<TIndex>,
    errorLog: IErrorLog,
    guidFactory: IGuidFactory,
    protected readonly _indexValueAccessor: IIndexValueAccessor,
    private readonly _proxyRegister: IProxyRegistry,
    private readonly _valueMetadata: IValueMetadata,
    private readonly mustHandleChange?: (change: IPropertyChange) => boolean,
  ) {
    this._indexChangeSubscriptionManager =
      new IndexChangeSubscriptionManager<TIndex>(
        indexSetObserverManager,
        errorLog,
        guidFactory,
      );
  }

  public dispose(): void {
    this._indexChangeSubscriptionManager.dispose();
  }

  public abstract applies(
    object: unknown,
    propertyInfo: IPropertyInfo,
  ): boolean;

  public create(
    owner: IDisposableOwner,
    object: TContext,
    propertyInfo: IPropertyInfo,
  ): IObserverProxyPair<TContext> {
    const index = propertyInfo.index as TIndex;
    const valueAtIndex = this._indexValueAccessor.getValue(object, index);
    const needProxy =
      this._valueMetadata.isAsync(valueAtIndex) ||
      propertyInfo.indexWatchRule?.test?.(index, object);
    const indexValueObserverProxyPair = needProxy
      ? this.createIndexValueProxy(
          propertyInfo,
          object,
          index,
          valueAtIndex,
          propertyInfo.indexWatchRule,
        )
      : undefined;
    // If we observe the index value than we ask the observer to provide the initial value
    // For example for promise observer we don't want to use the index value because the value
    // will be a promise and the value should be the resolved value. In this case the initial
    // value should be undefined and the resolved value will be emitted later
    const initialValue = indexValueObserverProxyPair
      ? indexValueObserverProxyPair.observer.value
      : valueAtIndex;
    const groupObserver = this.createGroupObserver(
      owner,
      object,
      index,
      initialValue,
      propertyInfo.initializeManually,
      indexValueObserverProxyPair?.observer,
      propertyInfo.indexWatchRule,
    );
    return {
      observer: groupObserver,
      proxy: indexValueObserverProxyPair?.proxy as TContext,
      proxyTarget: valueAtIndex as TContext,
    };
  }

  private createIndexValueProxy(
    propertyInfo: IPropertyInfo,
    object: TContext,
    index: TIndex,
    value: unknown,
    indexWatchRule: IIndexWatchRule | undefined,
  ): IObserverProxyPair | undefined {
    const setValue =
      propertyInfo.setValue ??
      ((v: unknown) => this._indexValueAccessor.setValue(object, index, v));
    return this.proxifyIndexValue(
      value,
      indexWatchRule,
      propertyInfo.initializeManually,
      setValue,
    );
  }

  private createGroupObserver(
    owner: IDisposableOwner,
    object: TContext,
    index: TIndex,
    initialValue: unknown,
    initializeManually: boolean | undefined,
    indexValueObserver: IObserver | undefined,
    indexWatchRule: IIndexWatchRule | undefined,
  ): ObserverGroup {
    const indexChangeSubscriptionsForContextManager =
      this._indexChangeSubscriptionManager.create(object).instance;
    const { id } = indexChangeSubscriptionsForContextManager.create({
      index,
      initialValue,
      indexValueObserver,
      indexWatchRule,
      initializeManually,
      mustHandleChange: this.mustHandleChange,
      onChanged: (change: IPropertyChange) =>
        this.onIndexSet(change, id, indexWatchRule),
      owner,
    });
    return Type.cast(
      indexChangeSubscriptionsForContextManager.getSubsriptionData(id),
    );
  }

  private onIndexSet(
    change: IPropertyChange,
    subsriptionId: string,
    indexWatchRule: IIndexWatchRule | undefined,
  ): void {
    const isAsync = this._valueMetadata.isAsync(change.newValue);
    const emitValue = Type.isNullOrUndefined(change.newValue) || !isAsync;
    const observerGroup = this._indexChangeSubscriptionManager
      .getFromId(change.target)
      ?.getSubsriptionData(subsriptionId);

    if (!observerGroup) {
      throw new UnexpectedException(
        `Observer group not found for subscription id ${subsriptionId}`,
      );
    }

    if (emitValue) {
      observerGroup.emitValue(change.newValue);
    }

    const observers = this.getNestedObservers(change, isAsync, indexWatchRule);

    observerGroup.replaceObservers(observers);
  }

  private getNestedObservers(
    change: IPropertyChange,
    isAsync: boolean,
    indexWatchRule: IIndexWatchRule | undefined,
  ): IObserver[] {
    let observers: IObserver[] = [];
    if (
      isAsync ||
      (indexWatchRule && indexWatchRule.test(change.index, change.target))
    ) {
      const observerProxyPair = this.proxifyIndexValue(
        change.newValue,
        indexWatchRule as IIndexWatchRule,
        true,
        change.setValue ??
          ((value: unknown) => {
            const obj = Type.toObject(change.target);
            if (obj) {
              obj[change.index as string] = value;
            }
          }),
      );

      if (observerProxyPair) {
        observers.push(observerProxyPair.observer);
      }
    }
    return observers;
  }

  private proxifyIndexValue(
    value: unknown,
    indexWatchRule: IIndexWatchRule | undefined,
    initializeManually: boolean | undefined,
    setValue: (value: unknown) => void,
  ): IObserverProxyPair | undefined {
    const target = this._proxyRegister.getProxyTarget(value) ?? value;
    const observerProxyPair = this._objectObserveryManager.create({
      target,
      indexWatchRule,
      initializeManually,
    }).instance;
    if (!observerProxyPair) {
      return undefined;
    }

    if (observerProxyPair.proxy !== undefined) {
      setValue(observerProxyPair.proxy);
    }

    return observerProxyPair;
  }
}
