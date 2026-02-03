import { type Operator, type Subscribable } from 'rxjs';

import { emptyFunction } from '../types';

import { SubscriptionMock } from './subscription.mock';

export class ObservableMock<T = unknown> implements Subscribable<T> {
  private _callback: (value: T) => void = emptyFunction;
  private readonly _subscribe = (e) => {
    this._callback = e.next ?? e;
    return new SubscriptionMock();
  };
  private readonly _next = (e) => this._callback(e);

  public source: ObservableMock<unknown> | undefined;
  public operator: Operator<unknown, T> | undefined;

  public readonly subscribe = jest.fn().mockImplementation(this._subscribe);
  public readonly lift = jest.fn();
  public readonly forEach = jest.fn();
  public readonly pipe = jest.fn();
  public readonly toPromise = jest.fn();
  public readonly next = jest.fn().mockImplementation(this._next);
}
