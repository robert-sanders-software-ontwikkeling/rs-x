import {
  type IDisposableOwner,
  type IErrorLog,
  type IIndexValueAccessor,
  truePredicate,
} from '@rs-x/core';

import type { IIndexWatchRule } from '../../index-watch-rule-registry/index-watch-rule.interface';
import {
  type IObjectPropertyObserverProxyPairManager,
  type IObserverProxyPair,
} from '../../object-property-observer-proxy-pair-manager.type';
import { type IObserver } from '../../observer.interface';
import { ObserverGroup } from '../../observer-group';
import { type IObjectObserverProxyPairFactory } from '../object-observer-proxy-pair.factory.interface';
import { type IProxyTarget } from '../object-observer-proxy-pair-manager.type';

export abstract class AbstractObjectObserverProxyPairFactory<
  TTarget,
  TData extends IProxyTarget<TTarget> = IProxyTarget<TTarget>,
> implements IObjectObserverProxyPairFactory<TTarget> {
  protected constructor(
    public readonly priority: number,
    private readonly _observerRootObserver: boolean,
    protected readonly _errorLog: IErrorLog,
    protected readonly _indexAccessor: IIndexValueAccessor,
    protected readonly _objectPropertyObserverProxyPairManager: IObjectPropertyObserverProxyPairManager,
  ) {}

  public abstract applies(object: object): boolean;

  public create(
    owner: IDisposableOwner,
    data: TData,
  ): IObserverProxyPair<TTarget> {
    const observerGroup = new ObserverGroup(
      this.createDisposableOwner(owner, data),
      data.target,
      data.target,
      truePredicate,
      this._errorLog,
      undefined,
      () => rootObserver?.observer,
      this._observerRootObserver,
    );
    this.onObserverGroupCreate(data.target, observerGroup, data.indexWatchRule);
    const rootObserver = this.createRootObserver(data);
    if (!data.initializeManually) {
      observerGroup.init();
    }

    return {
      observer: observerGroup,
      proxy: rootObserver?.proxy,
      proxyTarget: rootObserver?.proxyTarget,
    };
  }

  protected createDisposableOwner(
    owner: IDisposableOwner,
    _data: TData,
  ): IDisposableOwner {
    return owner;
  }

  protected abstract createRootObserver(
    data: TData,
  ): IObserverProxyPair<TTarget> | undefined;

  protected onObserverGroupCreate(
    target: TTarget,
    observerGroup: ObserverGroup,
    indexWatchRule?: IIndexWatchRule,
  ): void {
    if (!indexWatchRule) {
      return;
    }

    const observers: IObserver[] = [];

    const indexes = this._indexAccessor.getIndexes(target);
    for (const index of indexes) {
      if (!indexWatchRule.test(index, target)) {
        continue;
      }
      const { observer } = this._objectPropertyObserverProxyPairManager
        .create(target)
        .instance.create({
          index: index,
          indexWatchRule,
        }).instance;
      observers.push(observer);
    }

    observerGroup.replaceObservers(observers);
  }
}
