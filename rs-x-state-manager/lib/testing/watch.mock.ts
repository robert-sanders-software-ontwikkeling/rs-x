import { ObservableMock } from '../../../rs-x-core/lib/testing';
import {
  type IChangeCycleIndex,
  type IContextChanged,
  type IStateChange,
} from '../state-manager';
import { type IWatch } from '../state-manager/watch-factory/watch-factory';

export class WatchMock implements IWatch {
  public readonly changed = new ObservableMock<IStateChange>();
  public readonly contextChange = new ObservableMock<IContextChanged>();
  public readonly startChangeCycle = new ObservableMock<IChangeCycleIndex>();
  public readonly endChangeCycle = new ObservableMock<IChangeCycleIndex>();
  public readonly context: unknown;
  public readonly index: unknown;
  public readonly value: unknown;

  constructor(properties?: Partial<WatchMock>) {
    Object.assign(this, properties);
  }

  public readonly watch = jest.fn();
  public readonly unwatch = jest.fn();
  public readonly dispose = jest.fn();
}
