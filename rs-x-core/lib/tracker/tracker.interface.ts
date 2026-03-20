import { Observable } from 'rxjs';
import { IDisposable } from '../types/disposable.interface';

export interface ITracker<T, ST> extends IDisposable {
   readonly isRunning: boolean;
   onTick: Observable<T | undefined>;
   onStop: Observable<void>;
   start(e?: ST): void;
   stop(): void;
}
