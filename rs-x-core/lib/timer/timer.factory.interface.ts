import { ITracker } from '@rs-x/core';

export interface ITimerFactory {
   createDelay<T>(delay: number, data?: T): ITracker<T, void>;
   createTimer<T>(interval: number, data?: T): ITracker<T, void>;
}
