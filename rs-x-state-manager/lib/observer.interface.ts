import { IDisposable, IPropertyChange } from '@rs-x-core';
import { Observable } from 'rxjs';

export interface IObserver<T = unknown> extends IDisposable {
   target: T;
   id?: unknown;
   readonly changed: Observable<IPropertyChange>;
   readonly initialValue: unknown;
   init(): void;
}
