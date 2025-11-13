import { IDisposable } from '@rs-x/core';
import { IStateChange } from '@rs-x/state-manager';
import { Observable } from 'rxjs';

export interface IIndexValueObserver extends IDisposable {
   readonly changed: Observable<IStateChange>;
   getValue(context: unknown, key: unknown): unknown;
   setValue(context: unknown, key: unknown, value: unknown): void;
}
