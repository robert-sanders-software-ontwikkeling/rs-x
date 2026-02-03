import { Observable, ReplaySubject, Subscription } from 'rxjs';

import {
  type IDisposableOwner,
  Inject,
  Injectable,
  type IObservableAccessor,
  type IPropertyChange,
  RsXCoreInjectionTokens,
  SingletonFactory,
} from '@rs-x/core';

import { AbstractObserver } from '../../abstract-observer';

import type {
  IObservableObserverProxyPair,
  IObservableProxyData,
  IObservableProxyFactory,
} from './observable-proxy.factory.type';

class ObservableProxy extends AbstractObserver<
  Observable<unknown>,
  undefined,
  undefined
> {
  private _observableSubscription: Subscription | undefined;
  private _oldValue: unknown;

  constructor(
    owner: IDisposableOwner,
    target: Observable<unknown>,
    private readonly _observableAccessor: IObservableAccessor,
  ) {
    super(owner, target, undefined, new ReplaySubject<IPropertyChange>(1));
  }

  public override init(): void {
    if (this._observableSubscription) {
      return;
    }
    this._observableSubscription = this.target.subscribe(
      this.emitObservableChange,
    );
  }

  protected override disposeInternal(): void {
    this._observableSubscription?.unsubscribe();
    this._observableAccessor.clearLastValue(this.target);
    this._observableSubscription = undefined;
    this._oldValue = null;
  }

  private emitObservableChange = (newValue: unknown): void => {
    if (newValue === this._oldValue || this.isDisposed) {
      return;
    }

    this._oldValue = newValue;
    this._observableAccessor.setLastValue(this.target, newValue);

    this.emitChange({
      arguments: [],
      chain: [],
      target: this.target,
      index: this.id,
      newValue,
    });
  };
}

@Injectable()
export class ObservableProxyFactory
  extends SingletonFactory<
    Observable<unknown>,
    IObservableProxyData,
    IObservableObserverProxyPair
  >
  implements IObservableProxyFactory
{
  constructor(
    @Inject(RsXCoreInjectionTokens.IObservableAccessor)
    private readonly _observableAccessor: IObservableAccessor,
  ) {
    super();
  }

  public override getId(data: IObservableProxyData): Observable<unknown> {
    return data.observable;
  }

  protected override createId(data: IObservableProxyData): Observable<unknown> {
    return data.observable;
  }

  protected override createInstance(
    data: IObservableProxyData,
    id: Observable<unknown>,
  ): IObservableObserverProxyPair {
    const observer = new ObservableProxy(
      {
        canDispose: () => this.getReferenceCount(id) === 1,
        release: () => {
          this.release(id);
          data.owner?.release();
        },
      },
      data.observable,
      this._observableAccessor,
    );
    return {
      observer,
      proxy: undefined,
      proxyTarget: data.observable,
    };
  }

  protected override releaseInstance(
    observableObserverWithProxy: IObservableObserverProxyPair,
  ): void {
    observableObserverWithProxy.observer.dispose();
  }
}
