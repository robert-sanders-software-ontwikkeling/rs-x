import { Observable, Subject } from 'rxjs';
import { IIndexValueAccessor } from './index-value-accessor.interface';

export type LastValuObservable = Subject<unknown> | Observable<unknown>;

export interface IObservableAccessor
   extends IIndexValueAccessor<LastValuObservable, unknown> {
   setLastValue(observable: LastValuObservable, value: unknown): void;
   clearLastValue(observable: LastValuObservable): void;
}
