import { type Subscription } from 'rxjs';

import {
  GroupedKeyedInstanceFactory,
  type IErrorLog,
  type IKeyedInstanceFactory,
  type IPropertyChange,
} from '@rs-x/core';

import { type IObserver } from './observer.interface';

export interface ISubscriptionWithData<TSubscriptionData> {
  subscription: Subscription;
  data: TSubscriptionData;
}

export interface IChangeSubscriptionsCreateMethods {
  onChanged: (change: IPropertyChange) => void;
  init?: (observer: IObserver) => void;
}

export interface IGroupedChangeSubscriptionsForContextManager<
  TSubsriptionData,
  TData,
  TIdData = TData,
> extends IKeyedInstanceFactory<number, TData, IObserver, TIdData> {
  getSubsriptionData(id: number): TSubsriptionData | undefined;
}

export abstract class GroupedChangeSubscriptionsForContextManager<
  TSubsriptionData,
  TData extends TIdData & IChangeSubscriptionsCreateMethods,
  TIdData = TData,
>
  extends GroupedKeyedInstanceFactory<number, TData, IObserver>
  implements
    IGroupedChangeSubscriptionsForContextManager<
      TSubsriptionData,
      TData,
      TIdData
    >
{
  private _nextId = 0;
  private readonly _subscriptions = new Map<
    number,
    ISubscriptionWithData<TSubsriptionData>
  >();

  constructor(
    private _context: unknown,
    private readonly releaseContext: () => void,
    protected readonly _errorLog: IErrorLog,
  ) {
    super();
  }

  protected get context(): unknown {
    return this._context;
  }

  public getSubsriptionData(id: number): TSubsriptionData | undefined {
    return this._subscriptions.get(id)?.data;
  }

  protected override createInstance(data: TData, id: number): IObserver {
    const { observer, subscriptionData } = this.createObserver(
      this._context,
      data,
      id,
    );
    this._subscriptions.set(id, {
      subscription: observer.changed.subscribe({
        next: data.onChanged,
        error: (e) =>
          this._errorLog.add({
            message: `Failed to handle change emitted ${id}`,
            exception: e,
            context: this._context,
            fatal: true,
            data,
          }),
      }),
      data: subscriptionData,
    });

    return observer;
  }

  protected override onInstanceCreated(
    observer: IObserver<unknown>,
    data: TData,
  ): void {
    const init = data.init
      ? data.init
      : (observer: IObserver) => observer.init();
    init(observer);
  }

  protected abstract createObserver(
    context: unknown,
    data: TData,
    id: number,
  ): { subscriptionData: TSubsriptionData; observer: IObserver };

  protected override releaseInstance(observer: IObserver, id: number): void {
    super.releaseInstance(observer, id);
    this._subscriptions.get(id)?.subscription.unsubscribe();
    this._subscriptions.delete(id);
  }

  protected override onReleased(): void {
    this.releaseContext();
  }

  protected override createUniqueId(_data: TData): number {
    return this._nextId++;
  }
}
