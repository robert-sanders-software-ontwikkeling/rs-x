import { type IDisposable, type IPropertyChange } from '@rs-x/core';
import { type Observable } from 'rxjs';

export interface IObserver<T = unknown> extends IDisposable {
   target: T | undefined;
   id?: unknown;
   readonly changed: Observable<IPropertyChange>;
   readonly value: unknown;
   init(): void;
}
