import { type IObserver } from '../observer.interface';
import { ObservableMock } from '@rs-x/core/testing';

export class ObserverMock implements IObserver {
   public target: unknown;
   public id?: unknown;
   public changed = new ObservableMock();
   public value: unknown;
   public readonly equalTo = jest.fn();
   public readonly init = jest.fn();
   public readonly dispose = jest.fn();
}
