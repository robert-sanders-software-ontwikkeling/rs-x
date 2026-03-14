import { type Observable, type Subject } from 'rxjs';

import { type IIndexValueAccessor } from './index-value-accessor.interface';

export type LastValueObservable = Subject<unknown> | Observable<unknown>;

export interface IObservableAccessor extends IIndexValueAccessor<
  LastValueObservable,
  unknown
> {
  setLastValue(observable: LastValueObservable, value: unknown): void;
  clearLastValue(observable: LastValueObservable): void;
}
