import { type Subscription } from 'rxjs';

import {
  type IErrorLog,
  type IGuidFactory,
  type IPropertyChange,
  type ISingletonFactory,
  SingletonFactoryWithGuid,
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
> extends ISingletonFactory<string, TData, IObserver, TIdData> {
  getSubsriptionData(id: string): TSubsriptionData | undefined;
}

export abstract class GroupedChangeSubscriptionsForContextManager<
  TSubsriptionData,
  TData extends TIdData & IChangeSubscriptionsCreateMethods,
  TIdData = TData,
>
  extends SingletonFactoryWithGuid<TData, IObserver>
  implements
    IGroupedChangeSubscriptionsForContextManager<
      TSubsriptionData,
      TData,
      TIdData
    >
{
  private readonly _subscriptions = new Map<
    string,
    ISubscriptionWithData<TSubsriptionData>
  >();

  constructor(
    private _context: unknown,
    private readonly releaseContext: () => void,
    protected readonly _errorLog: IErrorLog,
    guidFactory: IGuidFactory,
  ) {
    super(guidFactory);
  }

  protected get context(): unknown {
    return this._context;
  }

  public getSubsriptionData(id: string): TSubsriptionData | undefined {
    return this._subscriptions.get(id)?.data;
  }

  protected override createInstance(data: TData, id: string): IObserver {
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
    id: string,
  ): { subscriptionData: TSubsriptionData; observer: IObserver };

  protected override releaseInstance(observer: IObserver, id: string): void {
    super.releaseInstance(observer, id);
    this._subscriptions.get(id)?.subscription.unsubscribe();
    this._subscriptions.delete(id);
  }

  protected override onReleased(): void {
    this.releaseContext();
  }
}
