import { Subscription } from 'rxjs';

import {
  type DateProperty,
  type IDatePropertyAccessor,
  type IDisposableOwner,
  type IErrorLog,
  Inject,
  Injectable,
  type IPropertyChange,
  RsXCoreInjectionTokens,
  SingletonFactory,
} from '@rs-x/core';

import { AbstractObserver } from '../../../abstract-observer';
import type { IIndexWatchRuleRegistry } from '../../../index-watch-rule-registry/index-watch-rule-registry.type';
import type { IObserver } from '../../../observer.interface';
import type { IDateProxyFactory } from '../../../proxies/date-proxy/date-proxy.factory.type';
import { RsXStateManagerInjectionTokens } from '../../../rs-x-state-manager-injection-tokens';

import type {
  IDatePropertyObserverIdInfo,
  IDatePropertyObserverInfo,
  IDatePropertyObserverManager,
  IProperForDataObserverManager,
} from './date-property-observer-manager.type';

class DatePropertyObserver extends AbstractObserver<Date> {
  private _oldValue: unknown;
  private readonly _dateChangeSubscription: Subscription;

  constructor(
    owner: IDisposableOwner,
    target: Date,
    propertyName: DateProperty,
    datePropertyAccessor: IDatePropertyAccessor,
    private readonly _dateObserver: IObserver,
    private readonly _errorLog: IErrorLog,
  ) {
    super(
      owner,
      target,
      datePropertyAccessor.getValue(target, propertyName),
      undefined,
      propertyName,
    );

    this._oldValue = this.value;
    this._dateChangeSubscription = this._dateObserver.changed.subscribe({
      next: this.onDateChanged,
      error: (e) =>
        this._errorLog.add({
          message: `Failed to handle change for Date  property '${propertyName}'`,
          exception: e,
          context: target,
          fatal: true,
        }),
    });
  }

  protected override disposeInternal(): void {
    this._dateObserver.dispose();
    this._dateChangeSubscription.unsubscribe();
  }

  private onDateChanged = (change: IPropertyChange) => {
    if (change.index !== this.id || change.newValue === this._oldValue) {
      return;
    }

    this.emitChange(change);
    this._oldValue = change.newValue;
  };
}

class ProperForDataObserverManager
  extends SingletonFactory<
    DateProperty,
    IDatePropertyObserverInfo,
    IObserver,
    IDatePropertyObserverIdInfo
  >
  implements IProperForDataObserverManager
{
  constructor(
    private readonly _date: Date,
    private readonly _dateProxyFactory: IDateProxyFactory,
    private readonly _datePropertyAccessor: IDatePropertyAccessor,
    private readonly _errorLog: IErrorLog,
    private readonly _indexWatchPredicateRegistry: IIndexWatchRuleRegistry,
    private readonly releaseObject: () => void,
  ) {
    super();
  }

  public override getId(data: IDatePropertyObserverIdInfo): DateProperty {
    return data.index;
  }

  protected override createId(data: IDatePropertyObserverIdInfo): DateProperty {
    return data.index;
  }

  protected override createInstance(
    data: IDatePropertyObserverInfo,
    index: DateProperty,
  ): IObserver {
    const indexWatchPredicate = (targetIndex, target, context) =>
      targetIndex === index && target === context;
    
    const indexWatchRule = this._indexWatchPredicateRegistry.register(
      this._date,
      index,
      indexWatchPredicate,
    );
    this._indexWatchPredicateRegistry.register(
      this._date,
      index,
      indexWatchPredicate,
    );
    const dateObserver = this._dateProxyFactory.create({
      date: this._date,
      indexWatchRule,
    }).instance.observer;
    return new DatePropertyObserver(
      {
        canDispose: () => this.getReferenceCount(index) === 1,
        release: () => {
          this.release(index);
          this._indexWatchPredicateRegistry.unregister(
            this._date,
            index,
            indexWatchPredicate,
          );
        },
      },
      this._date,
      data.index,
      this._datePropertyAccessor,
      dateObserver,
      this._errorLog,
    );
  }

  protected override releaseInstance(observer: IObserver): void {
    observer.dispose();
  }

  protected override onReleased(): void {
    this.releaseObject();
  }
}

@Injectable()
export class DatePropertyObserverManager
  extends SingletonFactory<Date, Date, IProperForDataObserverManager>
  implements IDatePropertyObserverManager
{
  constructor(
    @Inject(RsXStateManagerInjectionTokens.IDateProxyFactory)
    private readonly _dateProxyFactory: IDateProxyFactory,
    @Inject(RsXCoreInjectionTokens.IErrorLog)
    private readonly _errorLog: IErrorLog,
    @Inject(RsXCoreInjectionTokens.IDatePropertyAccessor)
    private readonly _datePropertyAccessor: IDatePropertyAccessor,
    @Inject(RsXStateManagerInjectionTokens.IIndexWatchRuleRegistry)
    private readonly _indexWatchTestRuleRegistry: IIndexWatchRuleRegistry,
  ) {
    super();
  }

  public override getId(date: Date): Date {
    return date;
  }

  public override createId(date: Date): Date {
    return date;
  }

  protected override createInstance(date: Date): IProperForDataObserverManager {
    return new ProperForDataObserverManager(
      date,
      this._dateProxyFactory,
      this._datePropertyAccessor,
      this._errorLog,
      this._indexWatchTestRuleRegistry,
      () => this.release(date),
    );
  }

  protected override releaseInstance(
    properForDataObserverManager: IProperForDataObserverManager,
  ): void {
    properForDataObserverManager.dispose();
  }
}
